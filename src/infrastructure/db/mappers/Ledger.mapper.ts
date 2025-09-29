import { LedgerEntry } from '../../../domain/entities/LedgerEntry';
import { Height } from '../../../domain/value-objects/Height';
import { LedgerEntryOrm } from '../entities/LedgerEntry.orm';
import { LedgerHead } from '../../../domain/entities/LedgerHead';
import { LedgerHeadOrm } from '../entities/LedgerHead.orm';
import { Money } from 'src/domain/value-objects/Money';
import { OccurredAt } from 'src/domain/value-objects/OccurredAt';

export const toDomainEntry = (o: LedgerEntryOrm): LedgerEntry =>
  new LedgerEntry(
    o.id,
    (o as any).account?.id ?? (o as any).account_id ?? '',
    o.type as any,
    Money.fromDecimal(o.amount),
    Money.fromDecimal(o.fee),
    new OccurredAt(new Date(o.occurred_at)),
    o.description ?? null,
    o.prev_hash,
    o.hash,
    Height.from(o.height),
    o.related_tx_id ?? null,
  );

export const toOrmEntry = (d: LedgerEntry): Partial<LedgerEntryOrm> => ({
  id: d.id,
  account: { id: d.accountId } as any,
  type: d.type,
  amount: d.amount.toDecimal(),
  fee: d.fee.toDecimal(),
  description: d.description ?? undefined,
  occurred_at: d.occurredAt.date,
  prev_hash: d.prevHash,
  hash: d.hash,
  height: d.height.toString(),
  related_tx_id: d.relatedTxId ?? undefined,
});

export const toDomainHead = (o: LedgerHeadOrm): LedgerHead =>
  new LedgerHead(o.account_id, o.head_hash, Height.from(o.height));
