import { Type } from "class-transformer"

export class CreateJunggo {
    @Type(() => Number)
    token: number

    product: string
    product_status: string
    //거래 방식
    method: string
    delivery_fee: string
    trading_area: string
    product_description: string
}