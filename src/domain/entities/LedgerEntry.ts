import { Height } from '../value-objects/Height';
import { Money } from '../value-objects/Money';
import { OccurredAt } from '../value-objects/OccurredAt';
import { OperationType } from '../enums/OperationType';

export type LedgerType = OperationType;

export class LedgerEntry {
  constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly type: LedgerType,
    public readonly amount: Money,
    public readonly fee: Money,
    public readonly occurredAt: OccurredAt,
    public readonly description: string | null,
    public readonly prevHash: string | null,
    public readonly hash: string,
    public readonly height: Height,
    public readonly relatedTxId: string | null,
  ) {}
}
