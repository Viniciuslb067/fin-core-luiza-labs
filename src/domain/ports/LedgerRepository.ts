import { LedgerEntry } from '../entities/LedgerEntry';
import { LedgerHead } from '../entities/LedgerHead';

export interface LedgerRepository {
  getHeadForUpdate(accountId: string): Promise<LedgerHead>;
  append(entry: LedgerEntry): Promise<void>;
  advanceHead(head: LedgerHead, newHash: string): Promise<void>;
}
