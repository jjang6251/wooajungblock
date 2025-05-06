import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Blockchain } from './blockchain/entity/blockchain.entity';
import { Escrow } from './blockchain/entity/create-escrow.entity';
import { Junggo } from './junggo/entity/create-junggo.entity';

dotenv.config();

export const typeORMConfig: TypeOrmModuleOptions = {
  dateStrings: true,
  type: 'mysql',
  host: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'wooajeong',
  entities: [Blockchain, Escrow, Junggo],
  synchronize: true,
};
