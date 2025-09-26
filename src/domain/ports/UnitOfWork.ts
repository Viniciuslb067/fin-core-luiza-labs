import { AccountRepository } from './AccountRepository';
import { LedgerRepository } from './LedgerRepository';

export interface UnitOfWork<Self extends UnitOfWork<Self> = any> {
  withTransaction<T>(fn: (ctx: Self) => Promise<T>): Promise<T>;
  accounts: AccountRepository;
  ledger: LedgerRepository;
}
