import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CoinDollar } from './dto/coindollar.dto';
import { Blockchain } from './entity/blockchain.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateEscrow } from './dto/askro.dto';
import { Escrow } from './entity/create-escrow.entity';

@Injectable()
export class BlockchainService {

    constructor(@InjectRepository(Blockchain) private blockRepository: Repository<Blockchain>,
        @InjectRepository(Escrow)
        private escrowRepository: Repository<Escrow>,
        private dataSource: DataSource  // Connection 대신 DataSource 사용
    ) { }

    //현금 -> coin
    async coindollar(userid, coindollar: CoinDollar) {
        const existingUser = await this.findOne(userid);

        if (existingUser) {
            // 기존 사용자가 있는 경우 토큰 값만 업데이트
            await this.blockRepository.update(
                { userId: userid }, // 조건 (WHERE)
                { token: existingUser.token + coindollar.token } // 업데이트할 필드 (SET)
            );

            // 성공 메시지 반환
            throw new HttpException('토큰이 업데이트 되었습니다.', HttpStatus.OK);
        }

        const saveData = {
            userId: userid,
            token: coindollar.token
        }

        try {
            // 데이터베이스에 저장을 시도합니다.
            const newMember = this.blockRepository.create(saveData);
            await this.blockRepository.save(newMember);
        } catch (error) {
            // 저장이 실패한 경우 500 Internal Server Error 상태 코드와 함께 메시지를 반환합니다.
            throw new HttpException('토큰 저장에 실패했습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        throw new HttpException('토큰 저장 완료.', HttpStatus.CREATED);
    }

    //코인잔액 조회
    async coinbalance(userid) {
        try {
            const existingUser = await this.findOne(userid);

            if (!existingUser) {
                return null; // 사용자가 존재하지 않는 경우
            }

            const result = {
                token: existingUser.token
            }

            return result; // 토큰 잔액 반환
        } catch (error) {
            throw new HttpException('잔액 조회에 실패했습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    //(에스크로) 생성
    async createEscrow(escrow: CreateEscrow) {
        // 1. 입력 데이터 검증
        if (!escrow.buyer || !escrow.seller || !escrow.product || escrow.token <= 0) {
            throw new HttpException('필수 입력 데이터가 누락되었거나 유효하지 않습니다.', HttpStatus.BAD_REQUEST);
        }

        // 2. 단일 쿼리로 필요한 사용자 정보 조회 (여러 쿼리 대신 IN 연산자 사용)
        const users = await this.blockRepository.find({
            where: { userId: In([escrow.buyer, escrow.seller]) }
        });

        // 3. 결과 맵핑 (조회 결과를 객체로 변환하여 접근성 향상)
        const userMap = users.reduce((map, user) => {
            map[user.userId] = user;
            return map;
        }, {});

        const buyer = userMap[escrow.buyer];
        const seller = userMap[escrow.seller];

        // 4. 필요한 검증 수행
        if (!buyer || !seller) {
            throw new HttpException(
                `${!buyer ? 'Buyer' : 'Seller'}가 존재하지 않습니다.`,
                HttpStatus.NOT_FOUND
            );
        }

        if (buyer.token < escrow.token) {
            throw new HttpException('구매자의 토큰이 부족합니다.', HttpStatus.BAD_REQUEST);
        }

        // 5. 트랜잭션 처리로 원자성 보장
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 고유 ID 생성 (현재 날짜 + 랜덤 숫자 기반)
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
            const random = Math.floor(1000 + Math.random() * 9000);
            const escrowId = `ESC-${dateStr}-${random}`;

            // 구매자 토큰 차감
            await queryRunner.manager.update(
                Blockchain,
                { userId: buyer.userId },
                { token: buyer.token - escrow.token }
            );

            // 에스크로 엔티티 생성 및 저장
            const escrowEntity = {
                ...escrow,
                status: 'created',
                withdrawBuyerApproved: false,
                deleteSellerApproved: false,
                deleteBuyerApproved: false,
                createdAt: new Date()
            };

            await queryRunner.manager.save(Escrow, escrowEntity);

            // 트랜잭션 커밋
            await queryRunner.commitTransaction();

            // 생성된 에스크로 정보 반환
            return {
                statusCode: HttpStatus.CREATED,
                message: '에스크로가 성공적으로 생성되었습니다.',
                escrowId,
                data: escrowEntity
            };
        } catch (error) {
            // 에러 발생 시 롤백
            await queryRunner.rollbackTransaction();

            // 에러 로깅 (실제 구현에서는 로깅 서비스 사용 권장)
            console.error('에스크로 생성 실패:', error);

            throw new HttpException(
                '에스크로 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            // 항상 쿼리 러너 해제
            await queryRunner.release();
        }
    }

    //(에스크로) 조회
    async checkEscrow(userid) {
        const userId = userid;
        try {
            // buyer 또는 seller 필드에서 userId가 포함된 모든 에스크로 조회
            const escrows = await this.escrowRepository.find({
                where: [
                    { buyer: userId },  // buyer가 userId인 경우
                    { seller: userId }  // seller가 userId인 경우
                ],
                order: {
                    createdAt: 'DESC'  // 최신순으로 정렬
                }
            });

            // 조회 결과가 없는 경우
            if (escrows.length === 0) {
                return {
                    statusCode: HttpStatus.OK,
                    message: `${userId}와 관련된 에스크로 거래가 없습니다.`,
                    data: []
                };
            }

            // 각 에스크로에 구매자/판매자 역할 정보 추가
            const enhancedEscrows = escrows.map(escrow => {
                return {
                    ...escrow,
                    role: escrow.buyer === userId ? 'buyer' : 'seller'
                };
            });

            return {
                statusCode: HttpStatus.OK,
                message: `${userId}와 관련된 에스크로 거래 ${escrows.length}건이 조회되었습니다.`,
                data: enhancedEscrows
            };
        } catch (error) {
            console.error('에스크로 조회 실패:', error);
            throw new HttpException(
                '에스크로 조회 중 오류가 발생했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    //(에스크로) 삭제 (판매자/구매자 동의 있어야 삭제됨)
    async approveEscrowDeletion(userid, escrowId: string) {
        const userId = userid;
        // 트랜잭션 시작
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 에스크로 조회 - TypeORM 최신 문법 사용
            const escrow = await queryRunner.manager.findOneBy(Escrow, {
                id: escrowId
            });

            // 에스크로가 존재하지 않는 경우
            if (!escrow) {
                throw new HttpException('에스크로를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
            }

            // 요청한 사용자가 해당 에스크로의 참여자(구매자 또는 판매자)인지 확인
            if (escrow.buyer !== userId && escrow.seller !== userId) {
                throw new HttpException('이 에스크로에 대한 권한이 없습니다.', HttpStatus.FORBIDDEN);
            }

            let updateData = {};
            let userRole = '';

            // 사용자 역할에 따라 업데이트할 필드 결정
            if (escrow.buyer === userId) {
                updateData = { deleteBuyerApproved: true };
                userRole = '구매자';
            } else {
                updateData = { deleteSellerApproved: true };
                userRole = '판매자';
            }

            // 에스크로 업데이트
            await queryRunner.manager.update(
                Escrow,
                { id: escrowId },
                updateData
            );

            // 양쪽 모두 동의했는지 확인하기 위해 업데이트된 에스크로 다시 조회
            const updatedEscrow = await queryRunner.manager.findOneBy(Escrow, {
                id: escrowId
            });

            // 업데이트된 에스크로가 존재하지 않는 경우
            if (!updatedEscrow) {
                throw new HttpException('업데이트된 에스크로 정보를 조회할 수 없습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // 구매자와 판매자 모두 삭제에 동의한 경우
            let bothApproved = false;
            if (updatedEscrow.deleteBuyerApproved && updatedEscrow.deleteSellerApproved) {
                bothApproved = true;

                // 먼저 현재 판매자의 블록체인 정보를 조회
                const sellerBlockchain = await queryRunner.manager.findOneBy(Blockchain, {
                    userId: updatedEscrow.buyer
                });

                if (!sellerBlockchain) {
                    throw new HttpException('판매자의 블록체인 정보를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
                }

                // 기존 토큰에 에스크로 토큰 더하기
                const updatedTokenAmount = sellerBlockchain.token + updatedEscrow.token;
                console.log(updatedTokenAmount);

                // 업데이트 실행
                await queryRunner.manager.update(
                    Blockchain,
                    { userId: updatedEscrow.buyer },
                    { token: updatedTokenAmount }
                );

                // 에스크로 데이터 완전히 삭제
                await queryRunner.manager.delete(Escrow, { id: escrowId });
            }

            // 트랜잭션 커밋
            await queryRunner.commitTransaction();

            return {
                statusCode: HttpStatus.OK,
                message: bothApproved
                    ? '구매자와 판매자 모두 삭제에 동의하여 에스크로가 완전히 삭제되었습니다.'
                    : `${userRole}의 삭제 동의가 처리되었습니다. ${userRole === '구매자' ? '판매자' : '구매자'}의 동의가 필요합니다.`,
                data: bothApproved
                    ? { id: escrowId, message: '데이터가 삭제되었습니다.' }
                    : {
                        id: escrowId,
                        buyer: escrow.buyer,
                        seller: escrow.seller,
                        deleteBuyerApproved: updatedEscrow.deleteBuyerApproved,
                        deleteSellerApproved: updatedEscrow.deleteSellerApproved,
                        status: updatedEscrow.status
                    }
            };
        } catch (error) {
            // 에러 발생 시 롤백
            await queryRunner.rollbackTransaction();

            // 에러가 HttpException이면 그대로 전달
            if (error instanceof HttpException) {
                throw error;
            }

            console.error('에스크로 삭제 동의 처리 실패:', error);
            throw new HttpException(
                '에스크로 삭제 동의 처리 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'),
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            // 쿼리 러너 해제
            await queryRunner.release();
        }
    }

    //(에스크로) 출금
    async processEscrowWithdrawal(userid, escrowId: string) {

        const userId = userid;
        // 트랜잭션 시작
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 에스크로 조회
            const escrow = await queryRunner.manager.findOneBy(Escrow, {
                id: escrowId
            });

            // 에스크로가 존재하지 않는 경우
            if (!escrow) {
                throw new HttpException('에스크로를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
            }

            // 요청한 사용자가 해당 에스크로의 참여자(구매자 또는 판매자)인지 확인
            if (escrow.buyer !== userId && escrow.seller !== userId) {
                throw new HttpException('이 에스크로에 대한 권한이 없습니다.', HttpStatus.FORBIDDEN);
            }

            // 사용자 역할 확인
            if (escrow.buyer === userId) {
                // 구매자인 경우 - withdrawBuyerApproved를 true로 설정
                await queryRunner.manager.update(
                    Escrow,
                    { id: escrowId },
                    { withdrawBuyerApproved: true }
                );

                await queryRunner.commitTransaction();

                return {
                    statusCode: HttpStatus.OK,
                    message: '출금 승인이 완료되었습니다. 판매자가 이제 토큰을 출금할 수 있습니다.',
                    data: {
                        id: escrowId,
                        buyer: escrow.buyer,
                        seller: escrow.seller,
                        product: escrow.product,
                        token: escrow.token,
                        withdrawBuyerApproved: true
                    }
                };
            } else {
                // 판매자인 경우 - 출금 처리
                // 먼저 구매자의 출금 승인 여부 확인
                if (!escrow.withdrawBuyerApproved) {
                    throw new HttpException(
                        '아직 구매자가 출금을 승인하지 않았습니다. 구매자의 승인이 필요합니다.',
                        HttpStatus.BAD_REQUEST
                    );
                }

                // 판매자 정보 조회
                const seller = await queryRunner.manager.findOneBy(Blockchain, {
                    userId: escrow.seller
                });

                if (!seller) {
                    throw new HttpException(
                        '판매자 정보를 찾을 수 없습니다.',
                        HttpStatus.NOT_FOUND
                    );
                }

                // 판매자의 토큰 업데이트
                await queryRunner.manager.update(
                    Blockchain,
                    { userId: escrow.seller },
                    { token: seller.token + escrow.token }
                );

                // 에스크로 상태 업데이트 또는 삭제
                // 여기서는 완료 상태로 업데이트하는 것으로 구현
                await queryRunner.manager.update(
                    Escrow,
                    { id: escrowId },
                    { status: 'completed' }
                );

                await queryRunner.commitTransaction();

                return {
                    statusCode: HttpStatus.OK,
                    message: `출금이 성공적으로 처리되었습니다. ${escrow.token} 토큰이 판매자 계정에 추가되었습니다.`,
                    data: {
                        id: escrowId,
                        seller: escrow.seller,
                        token: escrow.token,
                        status: 'completed',
                        sellerBalance: seller.token + escrow.token
                    }
                };
            }
        } catch (error) {
            // 에러 발생 시 롤백
            await queryRunner.rollbackTransaction();

            // 에러가 HttpException이면 그대로 전달
            if (error instanceof HttpException) {
                throw error;
            }

            console.error('에스크로 출금 처리 실패:', error);
            throw new HttpException(
                '에스크로 출금 처리 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'),
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        } finally {
            // 쿼리 러너 해제
            await queryRunner.release();
        }
    }

    //
    findOne(userId: string) {
        return this.blockRepository.findOne({ where: { userId } });
    }


}
