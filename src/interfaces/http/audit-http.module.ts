import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { VerifyChainUseCase } from '../../application/use-cases/VerifyChain.usecase';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';
import { LedgerHeadOrm } from '../../infrastructure/db/entities/LedgerHead.orm';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountOrm, LedgerEntryOrm, LedgerHeadOrm]),
  ],
  controllers: [AuditController],
  providers: [VerifyChainUseCase],
})
export class AuditHttpModule {}
