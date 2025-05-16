import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blockchain } from './entity/blockchain.entity';
import { Escrow } from './entity/create-escrow.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { Declaration } from './entity/declaration.entity';
import { TokenGateway } from './blockchain.gateway';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

@Module({
    controllers: [BlockchainController],
    providers: [BlockchainService, AuthGuard, TokenGateway],
    imports: [TypeOrmModule.forFeature([Blockchain, Escrow, Declaration]), JwtModule.register({
        secret: process.env.SECRET_KEY,
        signOptions: { expiresIn: '1h' }, // 필요에 따라 설정
    }),
    EventEmitterModule.forRoot({
        // 설정 옵션
        wildcard: false,
        delimiter: '.',
        newListener: false,
        removeListener: false,
        maxListeners: 10,
        verboseMemoryLeak: false,
        ignoreErrors: false,
    }),
    ]
})
export class BlockchainModule {

}
