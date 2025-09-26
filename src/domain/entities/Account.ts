import { AccountNumber } from '../value-objects/AccountNumber';
import { Money } from '../value-objects/Money';

export class Account {
  constructor(
    public readonly id: string,
    public readonly number: AccountNumber,
    private balance: Money,
    private creditLimit: Money,
  ) {}

  getBalance() {
    return this.balance;
  }

  getCreditLimit() {
    return this.creditLimit;
  }

  canDebit(amount: Money, fee: Money) {
    const available = this.balance.add(this.creditLimit);
    return available.gte(amount.add(fee));
  }

  applyCredit(amount: Money) {
    this.balance = this.balance.add(amount);
  }

  applyDebit(amount: Money, fee: Money) {
    this.balance = this.balance.sub(amount.add(fee));
  }
}
