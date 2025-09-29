import { Module } from '@nestjs/common';
import { TransactionsHttpModule } from './interfaces/http/transactions-http.module';
import { AuditHttpModule } from './interfaces/http/audit-http.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  imports: [AuditHttpModule, InfrastructureModule, TransactionsHttpModule],
})
export class AppModule {}
