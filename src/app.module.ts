import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { typeORMConfig } from './typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuthModule, BlockchainModule, TypeOrmModule.forRoot(typeORMConfig)]
})
export class AppModule {}
