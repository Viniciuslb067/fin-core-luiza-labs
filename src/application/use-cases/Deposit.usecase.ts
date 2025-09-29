import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { Money } from '../../domain/value-objects/Money';
import { OccurredAt } from '../../domain/value-objects/OccurredAt';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { computeLedgerHash } from '../../domain/services/ChainHasher';
import { OperationType } from '../../domain/enums/OperationType';
import { randomUUID } from 'node:crypto';

type Params = { accountNumber: string; amount: number; description?: string };

@Injectable()
export class DepositUseCase {
  constructor(@Inject('UnitOfWork') private readonly uow: UnitOfWork) {}

  exec(params: Params) {
    return this.uow.withTransaction((tx) => this.execIn(tx, params));
  }

  async execIn(tx: UnitOfWork, params: Params) {
    const num = AccountNumber.create(params.accountNumber);
    const amount = Money.fromDecimal(params.amount);
    if (params.amount <= 0) throw new BadRequestException('amount must be > 0');

    const acc = await tx.accounts.findByNumber(num);
    if (!acc) throw new BadRequestException('account not found');

    const head = await tx.ledger.getHeadForUpdate(acc.id);

    acc.applyCredit(amount);
    await tx.accounts.save(acc);

    const occurredAt = OccurredAt.now();
    const fee = Money.fromDecimal(0);
    const height = head.height.inc();
    const hash = computeLedgerHash({
      accountNumber: num.value,
      type: OperationType.DEPOSIT,
      amount: amount.toDecimal(),
      fee: fee.toDecimal(),
      occurredAtIso: occurredAt.date.toISOString(),
      prevHash: head.headHash,
      description: params.description ?? null,
    });

    const entry = new LedgerEntry(
      randomUUID(),
      acc.id,
      OperationType.DEPOSIT,
      amount,
      fee,
      occurredAt,
      params.description ?? null,
      head.headHash,
      hash,
      height,
      null,
    );
    await tx.ledger.append(entry);
    await tx.ledger.advanceHead(head, hash, height.toString());

    return {
      hash,
      height: height.toString(),
      balance: acc.getBalance().toDecimal(),
    };
  }
}
