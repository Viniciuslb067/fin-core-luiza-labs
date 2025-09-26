import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';
import { computeLedgerHash } from '../../domain/services/ChainHasher';

@Injectable()
export class DepositUseCase {
  constructor(private readonly ds: DataSource) {}

  async exec(params: {
    accountNumber: string;
    amount: number;
    description?: string;
  }) {
    return this.ds.transaction('SERIALIZABLE', (m) =>
      this.execWithManager(m, params),
    );
  }

  async execWithManager(
    m: EntityManager,
    params: { accountNumber: string; amount: number; description?: string },
  ) {
    const { accountNumber, amount, description } = params;

    if (amount <= 0) throw new BadRequestException('amount must be > 0');

    const acc = await m
      .getRepository(AccountOrm)
      .findOne({ where: { number: accountNumber } });
    if (!acc) throw new BadRequestException('account not found');

    let head = await m
      .createQueryBuilder(LedgerHeadOrm, 'h')
      .setLock('pessimistic_write')
      .where('h.account_id = :id', { id: acc.id })
      .getOne();

    if (!head) {
      head = m
        .getRepository(LedgerHeadOrm)
        .create({ account_id: acc.id, head_hash: null, height: '0' });
      await m.getRepository(LedgerHeadOrm).save(head);
    }

    const newBalance = (+acc.balance + amount).toFixed(2);
    acc.balance = newBalance;
    await m.getRepository(AccountOrm).save(acc);

    const occurredAtIso = new Date().toISOString();
    const amountStr = amount.toFixed(2);
    const feeStr = '0.00';
    const prevHash = head.head_hash;
    const height = (BigInt(head.height) + 1n).toString();

    const hash = computeLedgerHash({
      accountNumber: acc.number,
      type: 'DEPOSIT',
      amount: amountStr,
      fee: feeStr,
      occurredAtIso,
      prevHash,
      description: description ?? null,
    });

    const entry = m.getRepository(LedgerEntryOrm).create({
      account: acc,
      type: 'DEPOSIT',
      amount: amountStr,
      fee: feeStr,
      description,
      occurred_at: new Date(occurredAtIso),
      prev_hash: prevHash,
      hash,
      height,
    });
    await m.getRepository(LedgerEntryOrm).save(entry);

    head.head_hash = hash;
    head.height = height;
    await m.getRepository(LedgerHeadOrm).save(head);

    return { balance: newBalance, entryId: entry.id, hash };
  }
}
