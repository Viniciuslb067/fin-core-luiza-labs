import { Account } from '../../../domain/entities/Account';
import { AccountNumber } from '../../../domain/value-objects/AccountNumber';
import { Money } from '../../../domain/value-objects/Money';
import { AccountOrm } from '../entities/Account.orm';

export const toDomainAccount = (o: AccountOrm): Account =>
  new Account(
    o.id,
    AccountNumber.create(o.number),
    Money.fromDecimal(o.balance),
    Money.fromDecimal(o.credit_limit),
  );

export const toOrmAccount = (d: Account): Partial<AccountOrm> => ({
  id: d.id,
  number: d.number.value,
  balance: d.getBalance().toDecimal(),
  credit_limit: d.getCreditLimit().toDecimal(),
});
