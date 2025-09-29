import {
  Injectable,
  BadRequestException,
  Inject,
  HttpException,
} from '@nestjs/common';
import { DepositUseCase } from './Deposit.usecase';
import { WithdrawUseCase } from './Withdraw.usecase';
import { TransferUseCase } from './Transfer.usecase';
import type { UnitOfWork } from 'src/domain/ports/UnitOfWork';
import { OperationType } from '../../domain/enums/OperationType';

type BatchItem =
  | {
      type: typeof OperationType.DEPOSIT;
      accountNumber: string;
      amount: number;
      description?: string;
    }
  | {
      type: typeof OperationType.WITHDRAW;
      accountNumber: string;
      amount: number;
      description?: string;
    }
  | {
      type: typeof OperationType.TRANSFER;
      from: string;
      to: string;
      amount: number;
      description?: string;
    };

type BatchResult =
  | ({ type: typeof OperationType.DEPOSIT } & Awaited<
      ReturnType<DepositUseCase['execIn']>
    >)
  | ({ type: typeof OperationType.WITHDRAW } & Awaited<
      ReturnType<WithdrawUseCase['execIn']>
    >)
  | ({ type: typeof OperationType.TRANSFER } & Awaited<
      ReturnType<TransferUseCase['execIn']>
    >);

@Injectable()
export class ProcessBatchUseCase {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    private readonly depositUC: DepositUseCase,
    private readonly withdrawUC: WithdrawUseCase,
    private readonly transferUC: TransferUseCase,
  ) {}

  async exec(items: BatchItem[]) {
    if (!items?.length) {
      throw new BadRequestException('items must be a non-empty array');
    }

    return this.uow.withTransaction(async (tx) => {
      const results: BatchResult[] = [];

      for (const [index, item] of items.entries()) {
        try {
          switch (item.type) {
            case OperationType.DEPOSIT: {
              const r = await this.depositUC.execIn(tx, {
                accountNumber: item.accountNumber,
                amount: item.amount,
                description: item.description,
              });
              results.push({ type: OperationType.DEPOSIT, ...r });
              break;
            }
            case OperationType.WITHDRAW: {
              const r = await this.withdrawUC.execIn(tx, {
                accountNumber: item.accountNumber,
                amount: item.amount,
                description: item.description,
              });
              results.push({ ...r });
              break;
            }
            case OperationType.TRANSFER: {
              const r = await this.transferUC.execIn(tx, {
                from: item.from,
                to: item.to,
                amount: item.amount,
                description: item.description,
              });
              results.push({ type: OperationType.TRANSFER, ...r });
              break;
            }
            default:
              throw new BadRequestException(
                `unknown type ${(item as any).type}`,
              );
          }
        } catch (err: any) {
          const status =
            err instanceof HttpException ? (err.getStatus?.() ?? 400) : 400;
          const message =
            err instanceof HttpException
              ? ((err.getResponse?.() as any)?.message ?? err.message)
              : (err?.message ?? String(err));

          const context = {
            index,
            type: item.type,
            amount: item.amount,
            accountNumber:
              'accountNumber' in item ? item.accountNumber : undefined,
            from: 'from' in item ? item.from : undefined,
            to: 'to' in item ? item.to : undefined,
          };

          throw new HttpException(
            {
              statusCode: status,
              error: 'Bad Request',
              message,
              context,
            },
            status,
          );
        }
      }

      return { ok: true, results, count: items.length };
    });
  }
}
