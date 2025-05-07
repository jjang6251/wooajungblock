import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blockchain } from './entity/blockchain.entity';
import { Escrow } from './entity/create-escrow.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { Declaration } from './entity/declaration.entity';

@Module({
    controllers: [BlockchainController],
    providers: [BlockchainService, AuthGuard],
    imports: [TypeOrmModule.forFeature([Blockchain, Escrow, Declaration]), JwtModule.register({
        secret: process.env.SECRET_KEY,
        signOptions: { expiresIn: '1h' }, // 필요에 따라 설정
    })]
})
export class BlockchainModule {

}
