import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { DepositUseCase } from '../../application/use-cases/Deposit.usecase';
import { VerifyChainUseCase } from '../../application/use-cases/VerifyChain.usecase';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';
import { LedgerHeadOrm } from '../../infrastructure/db/entities/LedgerHead.orm';
import { WithdrawUseCase } from 'src/application/use-cases/Withdraw.usecase';
import { TransferUseCase } from 'src/application/use-cases/Transfer.usecase';
import { ProcessBatchUseCase } from 'src/application/use-cases/ProcessBatch.usecase';
import { GetBalanceUseCase } from 'src/application/use-cases/GetBalance.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountOrm, LedgerEntryOrm, LedgerHeadOrm]),
  ],
  controllers: [TransactionsController],
  providers: [
    DepositUseCase,
    VerifyChainUseCase,
    WithdrawUseCase,
    TransferUseCase,
    ProcessBatchUseCase,
    GetBalanceUseCase,
  ],
  exports: [],
})
export class TransactionsHttpModule {}
