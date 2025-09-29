import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { Money } from '../../domain/value-objects/Money';
import { OccurredAt } from '../../domain/value-objects/OccurredAt';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { computeLedgerHash } from '../../domain/services/ChainHasher';
import { OperationType } from '../../domain/enums/OperationType';
import { randomUUID } from 'node:crypto';
import type { FeePolicy } from 'src/domain/ports/FeePolicy';

type Params = {
  accountNumber: string;
  amount: number;
  description?: string;
};

@Injectable()
export class WithdrawUseCase {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    @Inject('FeePolicy') private readonly fees: FeePolicy,
  ) {}

  exec(params: Params) {
    return this.uow.withTransaction((tx) => this.execIn(tx, params));
  }

  async execIn(tx: UnitOfWork, { accountNumber, amount, description }: Params) {
    if (amount <= 0) throw new BadRequestException('amount must be > 0');

    const num = AccountNumber.create(accountNumber);
    const amt = Money.fromDecimal(amount);
    const fee = this.fees.calculate(amt, OperationType.WITHDRAW);

    const acc = await tx.accounts.findByNumber(num);
    if (!acc) throw new BadRequestException('account not found');

    if (!acc.canDebit(amt, fee)) {
      throw new BadRequestException(
        'insufficient funds considering credit limit',
      );
    }

    const head = await tx.ledger.getHeadForUpdate(acc.id);

    acc.applyDebit(amt, fee);
    await tx.accounts.save(acc);

    const occurredAt = OccurredAt.now();
    const nextHeight = head.height.inc();
    const hash = computeLedgerHash({
      accountNumber: num.value,
      type: OperationType.WITHDRAW,
      amount: amt.toDecimal(),
      fee: fee.toDecimal(),
      occurredAtIso: occurredAt.date.toISOString(),
      prevHash: head.headHash,
      description: description ?? null,
    });

    const entry = new LedgerEntry(
      randomUUID(),
      acc.id,
      OperationType.WITHDRAW,
      amt,
      fee,
      occurredAt,
      description ?? null,
      head.headHash,
      hash,
      nextHeight,
      null,
    );

    await tx.ledger.append(entry);
    await tx.ledger.advanceHead(head, hash, nextHeight.toString());

    return {
      balance: acc.getBalance().toDecimal(),
      hash,
      height: nextHeight.toString(),
      type: OperationType.WITHDRAW,
    };
  }
}
