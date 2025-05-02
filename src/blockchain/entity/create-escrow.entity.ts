import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn
} from 'typeorm';

@Entity({ name: 'escrows' })
export class Escrow {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    buyer: string;
    
    @Column()
    seller: string;
    
    @Column()
    product: string;
    
    @Column()
    token: number;
    
    @CreateDateColumn()
    createdAt: Date;
    
    // 에스크로 상태 (생성됨, 확인됨, 완료됨, 취소됨 등)
    @Column({ default: 'created' })
    status: string;
    
    // 구매자의 출금 동의 여부
    @Column({ default: false })
    withdrawBuyerApproved: boolean;

    // 판매자 삭제 동의 여부
    @Column({ default: false })
    deleteSellerApproved: boolean;

    // 구매자 삭제 동의 여부
    @Column({ default: false })
    deleteBuyerApproved: boolean;


}