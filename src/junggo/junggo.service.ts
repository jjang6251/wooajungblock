import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Junggo } from './entity/create-junggo.entity';
import { Repository } from 'typeorm';
import { GCS } from './gcs';
import { CreateJunggo } from './dto/create_junggo.dto';

@Injectable()
export class JunggoService {
    constructor(@InjectRepository(Junggo) private junggoRepository: Repository<Junggo>,
        private readonly gcsConfigure: GCS
    ) { }

    //중고 물품 생성
    async create(file: Express.Multer.File, createJunggo: CreateJunggo, userid: string) {
        const createdAt = new Date();
        let imgUrl: string;
      
        try {
          imgUrl = await this.gcsConfigure.uploadFile(file);
        } catch (err) {
          throw new HttpException(`이미지 업로드에 실패했습니다: ${err.message}`, HttpStatus.BAD_REQUEST);
        }
      
        const junggoData = {
          ...createJunggo,
          createdAt,
          img_url: imgUrl,
          nickname: userid,
        };
      
        try {
          const newEntity = this.junggoRepository.create(junggoData);
          await this.junggoRepository.save(newEntity);
      
          return {
            message: '물품이 성공적으로 등록되었습니다.',
            data: newEntity,
          };
        } catch (error) {
          throw new HttpException(`물품 등록에 실패했습니다: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

    
    //(리스트)유저 중고 물품들 조회
    async get_user_junggo_list(userid: string) {
        try {
          const junggoList = await this.junggoRepository.find({
            where: { nickname: userid },
            order: { createdAt: 'DESC' }, // 최신순 정렬 (선택 사항)
          });
      
          return {
            message: '중고 물품 목록 조회 성공',
            data: junggoList,
          };
        } catch (error) {
          throw new HttpException(`중고 물품 목록 조회 실패: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

    //(리스트) 전체 중고 물품 조회
    async get_junggo_list() {
        try {
          const junggoList = await this.junggoRepository.find({
            order: { createdAt: 'DESC' }, // 최신순 정렬 (선택 사항)
          });
      
          return {
            message: '중고 물품 목록 조회 성공',
            data: junggoList,
          };
        } catch (error) {
          throw new HttpException(`중고 물품 목록 조회 실패: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

    //중고 물품 상세 조회
    async get_junggo(product_id: number) {
      try {
        const junggo = await this.junggoRepository.findOne({
          where: { id: product_id },
        });
    
        if (!junggo) {
          throw new HttpException(`해당 ID(${product_id})의 중고 물품이 존재하지 않습니다.`, HttpStatus.NOT_FOUND);
        }
    
        return {
          message: '중고 물품 조회 성공',
          data: junggo,
        };
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(`중고 물품 조회 실패: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    //중고 물품 삭제(만든 사람만)
    async delete_junggo(userid: string, product_id: number) {
      try {
        // 1. 중고 물품 존재 여부 확인
        const junggo = await this.junggoRepository.findOne({ where: { id: product_id } });
    
        if (!junggo) {
          throw new HttpException(`해당 ID(${product_id})의 중고 물품이 존재하지 않습니다.`, HttpStatus.NOT_FOUND);
        }
    
        // 2. 작성자와 요청자가 일치하는지 확인
        if (junggo.nickname !== userid) {
          throw new HttpException(`물품 삭제 권한이 없습니다.`, HttpStatus.FORBIDDEN);
        }
    
        // 3. 이미지 삭제 (실패 시 중단)
        if (junggo.img_url) {
          try {
            await this.gcsConfigure.deleteFile(junggo.img_url);
          } catch (err) {
            throw new HttpException(`이미지 삭제 실패: ${err.message}`, HttpStatus.BAD_REQUEST);
          }
        }
    
        // 4. DB에서 물품 삭제
        await this.junggoRepository.delete(product_id);
    
        return {
          message: '중고 물품 및 이미지가 성공적으로 삭제되었습니다.',
        };
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(`중고 물품 삭제 실패: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
}
