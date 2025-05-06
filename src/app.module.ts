import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { typeORMConfig } from './typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JunggoModule } from './junggo/junggo.module';

@Module({
  imports: [AuthModule, BlockchainModule, TypeOrmModule.forRoot(typeORMConfig), JunggoModule]
})
export class AppModule {}
