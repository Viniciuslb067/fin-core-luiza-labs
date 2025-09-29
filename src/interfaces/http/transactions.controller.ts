import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  DepositDto,
  WithdrawDto,
  TransferDto,
  ProcessBatchDto,
} from '../../application/dto/transactions.dto';
import { DepositUseCase } from '../../application/use-cases/Deposit.usecase';
import { WithdrawUseCase } from '../../application/use-cases/Withdraw.usecase';
import { TransferUseCase } from '../../application/use-cases/Transfer.usecase';
import { ProcessBatchUseCase } from '../../application/use-cases/ProcessBatch.usecase';
import { VerifyChainUseCase } from '../../application/use-cases/VerifyChain.usecase';
import { GetBalanceUseCase } from 'src/application/use-cases/GetBalance.usecase';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly depositUC: DepositUseCase,
    private readonly withdrawUC: WithdrawUseCase,
    private readonly transferUC: TransferUseCase,
    private readonly batchUC: ProcessBatchUseCase,
    private readonly verifyUC: VerifyChainUseCase,
    private readonly getBalanceUC: GetBalanceUseCase,
  ) {}

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  async deposit(@Body() dto: DepositDto) {
    return this.depositUC.exec({
      accountNumber: dto.accountNumber,
      amount: dto.amount,
      description: dto.description,
    });
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(@Body() dto: WithdrawDto) {
    return this.withdrawUC.exec({
      accountNumber: dto.accountNumber,
      amount: dto.amount,
      description: dto.description,
    });
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(@Body() dto: TransferDto) {
    return this.transferUC.exec({
      from: dto.from,
      to: dto.to,
      amount: dto.amount,
      description: dto.description,
    });
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async processBatch(@Body() dto: ProcessBatchDto) {
    return this.batchUC.exec(dto.items);
  }

  @Get('verify/:accountNumber')
  async verify(@Param('accountNumber') accountNumber: string) {
    return this.verifyUC.exec(accountNumber);
  }

  @Get(':accountNumber/balance')
  @HttpCode(HttpStatus.OK)
  async balance(@Param('accountNumber') accountNumber: string) {
    return this.getBalanceUC.exec({ accountNumber });
  }
}
