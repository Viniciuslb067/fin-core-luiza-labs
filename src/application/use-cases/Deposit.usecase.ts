import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { Money } from '../../domain/value-objects/Money';
import { OccurredAt } from '../../domain/value-objects/OccurredAt';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { computeLedgerHash } from '../../domain/services/ChainHasher';

@Injectable()
export class DepositUseCase {
  constructor(@Inject('UnitOfWork') private readonly uow: UnitOfWork) {}

  async exec(params: {
    accountNumber: string;
    amount: number;
    description?: string;
  }) {
    const num = AccountNumber.create(params.accountNumber);
    const amount = Money.fromDecimal(params.amount);
    if (params.amount <= 0) throw new BadRequestException('amount must be > 0');

    return this.uow.withTransaction(async (ctx) => {
      const acc = await ctx.accounts.findByNumber(num);
      if (!acc) throw new BadRequestException('account not found');

      const head = await ctx.ledger.getHeadForUpdate(acc.id);

      acc.applyCredit(amount);
      await ctx.accounts.save(acc);

      const occurredAt = OccurredAt.now();
      const fee = Money.fromDecimal(0);
      const height = head.height.inc();
      const hash = computeLedgerHash({
        accountNumber: num.value,
        type: 'DEPOSIT',
        amount: amount.toDecimal(),
        fee: fee.toDecimal(),
        occurredAtIso: occurredAt.date.toISOString(),
        prevHash: head.headHash,
        description: params.description ?? null,
      });

      const entry = new LedgerEntry(
        crypto.randomUUID(),
        acc.id,
        'DEPOSIT',
        amount,
        fee,
        occurredAt,
        params.description ?? null,
        head.headHash,
        hash,
        height,
        null,
      );
      await ctx.ledger.append(entry);

      await ctx.ledger.advanceHead(head, hash);

      return {
        hash,
        height: height.toString(),
        balance: acc.getBalance().toDecimal(),
      };
    });
  }
}
