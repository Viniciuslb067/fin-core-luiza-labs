import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './infrastructure/db/typeorm.config';
import { TransactionsHttpModule } from './interfaces/http/transactions-http.module';
import { AuditHttpModule } from './interfaces/http/audit-http.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    TransactionsHttpModule,
    AuditHttpModule,
  ],
})
export class AppModule {}
