import { Module } from '@nestjs/common';
import { JunggoController } from './junggo.controller';
import { JunggoService } from './junggo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from 'src/auth/auth.guard';
import { GCS } from './gcs';
import { Junggo } from './entity/create-junggo.entity';

@Module({
  controllers: [JunggoController],
  providers: [JunggoService, AuthGuard, GCS],
  imports: [TypeOrmModule.forFeature([Junggo]), JwtModule.register({
    secret: process.env.SECRET_KEY,
    signOptions: { expiresIn: '1h' }, // 필요에 따라 설정

  })]
})
export class JunggoModule { }
