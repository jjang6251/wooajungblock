import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JunggoService } from './junggo.service';
import { CreateJunggo } from './dto/create_junggo.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('junggo')
export class JunggoController {

    constructor(private readonly junggoService: JunggoService) {}

    @UseGuards(AuthGuard)
    @Post('create')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() createJunggo: CreateJunggo, @Req() request) {

        const user = request.user;
        const userid = user.nickname;
        return await this.junggoService.create(file, createJunggo, userid);
    }

    //전체 중고 물품 리스트
    @Get('junggo_list')
    async getJunggoList(@Req() request) {
        return await this.junggoService.get_junggo_list();
    }


    //유저 중고 리스트
    @UseGuards(AuthGuard)
    @Get('user_junggo_list')
    async getUserJunggoList(@Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return await this.junggoService.get_user_junggo_list(userid);
    }

    //상세 물품 조회
    @Get('junggo_detail')
    async getJunggo(@Body('product_id') product_id: number) {
        return await this.junggoService.get_junggo(product_id);
    }

    //물품 삭제
    @UseGuards(AuthGuard)
    @Post('delete_junggo')
    async deleteJunggo(@Body('product_id') product_id: number, @Req() request) {
        const user = request.user;
        const userid = user.nickname;
        return await this.junggoService.delete_junggo(userid, product_id);
    }
}
