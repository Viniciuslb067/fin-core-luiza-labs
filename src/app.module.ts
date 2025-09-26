import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './infrastructure/db/typeorm.config';
import { TransactionsHttpModule } from './interfaces/http/transactions-http.module';
import { AuditHttpModule } from './interfaces/http/audit-http.module';
import { UnitOfWorkOrm } from './infrastructure/repositories/UnitOfWork.orm';
import { AccountRepositoryOrm } from './infrastructure/repositories/AccountRepository.orm';
import { LedgerRepositoryOrm } from './infrastructure/repositories/LedgerRepository.orm';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    TransactionsHttpModule,
    AuditHttpModule,
  ],
  providers: [
    UnitOfWorkOrm,
    AccountRepositoryOrm,
    LedgerRepositoryOrm,
    { provide: 'UnitOfWork', useExisting: UnitOfWorkOrm },
  ],
})
export class AppModule {}
