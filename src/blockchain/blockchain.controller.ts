import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CoinDollar } from './dto/coindollar.dto';
import { BlockchainService } from './blockchain.service';
import { CreateEscrow } from './dto/askro.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('blockchain')
@UseGuards(AuthGuard)
export class BlockchainController {

    constructor(private readonly blockService: BlockchainService) { }

    //현금 -> 코인
    @Post('/coin_to_dollar')
    async coindollar(@Body() coindollar: CoinDollar, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.coindollar(userid, coindollar);
    }

    //코인 잔액 확인
    @Get('/coinBalance')
    async coinbalance(@Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.coinbalance(userid);
    }

    //(에스크로 생성)
    @Post('/create_escrow')
    async createEscrow(@Body() escrow: CreateEscrow, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.createEscrow(escrow);
    }

    //(에스크로 조회)
    @Get('/check_escrow')
    async checkEscrow(@Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.checkEscrow(userid);
    }

    //(에스크로 삭제) -> 판매자/구매자 둘다의 동의 필요
    @Post('/delete_escrow')
    async deleteEscro(@Body('escrowId') escrowId: string, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.approveEscrowDeletion(userid, escrowId);
    }

    //(출금 동의 및 출금) 판매자/구매자
    @Post('/withdraw')
    async withdrawEscro(@Body('escrowId') escrowId: string, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.processEscrowWithdrawal(userid, escrowId);
    }

    //에스크로 신고/
    @Post('/declaration')
    async declare(@Body('escrowId') escrowId: string,@Body('declaration') declaration: string, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.declaration(userid, escrowId, declaration);
    }

    //에스크로 신고 취하
    @Post('/withdraw_declaration')
    async withdrawDeclare(@Body('escrowId') escrowId: string, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return this.blockService.withdraw_declaration(userid, escrowId);
    }
}
