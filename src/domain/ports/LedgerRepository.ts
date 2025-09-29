import { LedgerEntry } from '../entities/LedgerEntry';
import { LedgerHead } from '../entities/LedgerHead';

export interface LedgerRepository {
  getHeadForUpdate(accountId: string): Promise<LedgerHead>;
  getHead(accountId: string): Promise<LedgerHead | null>;
  append(entry: LedgerEntry): Promise<void>;
  advanceHead(
    head: LedgerHead,
    newHash: string,
    newHeight: string,
  ): Promise<void>;
  listByAccountAsc(accountId: string): Promise<LedgerEntry[]>;
}
