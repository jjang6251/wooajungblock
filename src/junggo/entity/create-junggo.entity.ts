import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToMany,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'junggo' })
export class Junggo {
    @PrimaryGeneratedColumn()
    id: number;
    
    //판매자
    @Column({ name: 'seller'})
    nickname: string;
    
    //판매 가격
    @Column({ name: 'token'})
    token: number;

    //판매 물건명
    @Column({name: 'product'})
    product: string;

    //등록 시간
    @CreateDateColumn()
    createdAt: Date;

    //제품 상태
    @Column({name: 'product_status'})
    product_status: string;

    //거래 방식
    @Column({name: 'method'})
    method: string;

    //배송비
    @Column({name: 'delivery_fee'})
    delivery_fee: string;

    //거래 희망지역
    @Column({name: 'trading_area'})
    trading_area: string;

    //상품 설명/정보
    @Column({name: 'product_description'})
    product_description: string;

    //상품 이미지 url
    @Column({name: 'img_url'})
    img_url: string;

    //물품명, 물품 가격, 등록 시간, 제품 상태, 거래방식, 배송비, 거래 희망 지역, 상품 설명/정보
}
