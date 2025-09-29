import 'dotenv/config';
import 'reflect-metadata';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

import { AccountOrm } from './entities/Account.orm';
import { LedgerEntryOrm } from './entities/LedgerEntry.orm';
import { LedgerHeadOrm } from './entities/LedgerHead.orm';

export const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'mysql',
  port: +(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASS ?? 'app',
  database: process.env.DB_NAME ?? 'fincore',
  entities: [AccountOrm, LedgerEntryOrm, LedgerHeadOrm],
  synchronize: false,
  logging: false,
  charset: 'utf8mb4',
  factories: [path.resolve(__dirname, 'factories/**/*{.ts,.js}')],
  seeds: [path.resolve(__dirname, 'seeds/**/*{.ts,.js}')],
  migrations: [path.resolve(__dirname, 'migrations/*.{ts,js}')],
};

export default new DataSource(dataSourceOptions);
