import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DepositUseCase } from './Deposit.usecase';
import { WithdrawUseCase } from './Withdraw.usecase';
import { TransferUseCase } from './Transfer.usecase';

type BatchItem =
  | {
      type: 'DEPOSIT';
      accountNumber: string;
      amount: number;
      description?: string;
    }
  | {
      type: 'WITHDRAW';
      accountNumber: string;
      amount: number;
      description?: string;
    }
  | {
      type: 'TRANSFER';
      from: string;
      to: string;
      amount: number;
      description?: string;
    };

@Injectable()
export class ProcessBatchUseCase {
  constructor(
    private readonly ds: DataSource,
    private readonly depositUC: DepositUseCase,
    private readonly withdrawUC: WithdrawUseCase,
    private readonly transferUC: TransferUseCase,
  ) {}

  async exec(items: BatchItem[]) {
    if (!items?.length)
      throw new BadRequestException('items must be a non-empty array');

    return this.ds.transaction('SERIALIZABLE', async (m) => {
      const results: any[] = [];
      for (const item of items) {
        switch (item.type) {
          case 'DEPOSIT': {
            const r = await this.depositUC.execWithManager(m, {
              accountNumber: item.accountNumber,
              amount: item.amount,
              description: item.description,
            });
            results.push({ type: 'DEPOSIT', ...r });
            break;
          }
          case 'WITHDRAW': {
            const r = await this.withdrawUC.execWithManager(m, {
              accountNumber: item.accountNumber,
              amount: item.amount,
              description: item.description,
            });
            results.push({ type: 'WITHDRAW', ...r });
            break;
          }
          case 'TRANSFER': {
            const r = await this.transferUC.execWithManager(m, {
              from: item.from,
              to: item.to,
              amount: item.amount,
              description: item.description,
            });
            results.push({ type: 'TRANSFER', ...r });
            break;
          }
          default:
            throw new BadRequestException(`unknown type ${(item as any).type}`);
        }
      }
      return { ok: true, results, count: items.length };
    });
  }
}
