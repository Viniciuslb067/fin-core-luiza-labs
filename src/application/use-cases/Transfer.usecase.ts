import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';
import { computeLedgerHash } from '../../domain/services/ChainHasher';

@Injectable()
export class TransferUseCase {
  constructor(private readonly ds: DataSource) {}

  private calcFee(amount: number) {
    const fixed = 1.0;
    const variable = amount * 0.005;
    return +(fixed + variable).toFixed(2);
  }

  async exec(params: {
    from: string;
    to: string;
    amount: number;
    description?: string;
  }) {
    return this.ds.transaction('SERIALIZABLE', (m) =>
      this.execWithManager(m, params),
    );
  }

  async execWithManager(
    m: EntityManager,
    params: { from: string; to: string; amount: number; description?: string },
  ) {
    const { from, to, amount, description } = params;
    if (from === to) throw new BadRequestException('from and to must differ');
    if (amount <= 0) throw new BadRequestException('amount must be > 0');

    const accounts = await m.getRepository(AccountOrm).find({
      where: [{ number: from }, { number: to }],
    });
    const origin = accounts.find((a) => a.number === from);
    const dest = accounts.find((a) => a.number === to);
    if (!origin || !dest) throw new BadRequestException('account(s) not found');

    const ordered = [origin, dest].sort((a, b) => (a.id < b.id ? -1 : 1));
    const heads: Record<string, LedgerHeadOrm> = {};

    for (const acc of ordered) {
      let h = await m
        .createQueryBuilder(LedgerHeadOrm, 'h')
        .setLock('pessimistic_write')
        .where('h.account_id = :id', { id: acc.id })
        .getOne();

      if (!h) {
        h = m
          .getRepository(LedgerHeadOrm)
          .create({ account_id: acc.id, head_hash: null, height: '0' });
        await m.getRepository(LedgerHeadOrm).save(h);
      }
      heads[acc.id] = h;
    }

    const oHead = heads[origin.id];
    const dHead = heads[dest.id];

    const fee = this.calcFee(amount);
    const total = amount + fee;
    const available = +origin.balance + +origin.credit_limit;
    if (available < total)
      throw new BadRequestException(
        'insufficient funds considering credit limit',
      );

    origin.balance = (+origin.balance - total).toFixed(2);
    dest.balance = (+dest.balance + amount).toFixed(2);
    await m.getRepository(AccountOrm).save([origin, dest]);

    const nowIso = new Date().toISOString();
    const amountStr = amount.toFixed(2);
    const feeStr = fee.toFixed(2);

    const outHeight = (BigInt(oHead.height) + 1n).toString();
    const outPrev = oHead.head_hash;

    const outHash = computeLedgerHash({
      accountNumber: origin.number,
      type: 'TRANSFER_OUT',
      amount: amountStr,
      fee: feeStr,
      occurredAtIso: nowIso,
      prevHash: outPrev,
      description: description ?? null,
    });

    const outEntry = m.getRepository(LedgerEntryOrm).create({
      account: origin,
      type: 'TRANSFER_OUT',
      amount: amountStr,
      fee: feeStr,
      description,
      occurred_at: new Date(nowIso),
      prev_hash: outPrev,
      hash: outHash,
      height: outHeight,
    });
    await m.getRepository(LedgerEntryOrm).save(outEntry);

    const inHeight = (BigInt(dHead.height) + 1n).toString();
    const inPrev = dHead.head_hash;

    const inHash = computeLedgerHash({
      accountNumber: dest.number,
      type: 'TRANSFER_IN',
      amount: amountStr,
      fee: '0.00',
      occurredAtIso: nowIso,
      prevHash: inPrev,
      description: description ?? null,
    });

    const inEntry = m.getRepository(LedgerEntryOrm).create({
      account: dest,
      type: 'TRANSFER_IN',
      amount: amountStr,
      fee: '0.00',
      description,
      occurred_at: new Date(nowIso),
      prev_hash: inPrev,
      hash: inHash,
      height: inHeight,
      related_tx_id: outEntry.id,
    });
    await m.getRepository(LedgerEntryOrm).save(inEntry);

    outEntry.related_tx_id = inEntry.id;
    await m.getRepository(LedgerEntryOrm).save(outEntry);

    oHead.head_hash = outHash;
    oHead.height = outHeight;
    dHead.head_hash = inHash;
    dHead.height = inHeight;
    await m.getRepository(LedgerHeadOrm).save([oHead, dHead]);

    return {
      outTxId: outEntry.id,
      inTxId: inEntry.id,
      originAfter: origin.balance,
      destAfter: dest.balance,
    };
  }
}
