import { Account } from '../entities/Account';
import { AccountNumber } from '../value-objects/AccountNumber';

export interface AccountRepository {
  findByNumber(num: AccountNumber): Promise<Account | null>;
  save(account: Account): Promise<void>;
}
