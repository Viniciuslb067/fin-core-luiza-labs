import { OperationType } from '../enums/OperationType';
import { FeePolicy } from '../ports/FeePolicy';
import { Money } from '../value-objects/Money';

export class FixedPlusRateFeePolicy implements FeePolicy {
  constructor(
    private readonly fixed: Money = Money.fromDecimal(1),
    private readonly rateBps: number = 50,
  ) {}

  calculate(amount: Money, op: OperationType): Money {
    if (op === OperationType.WITHDRAW || op === OperationType.TRANSFER_OUT) {
      const variable = Money.fromDecimal(
        (Number(amount.toDecimal()) * (this.rateBps / 10000)).toFixed(2),
      );
      return this.fixed.add(variable);
    }
    return Money.fromDecimal(0);
  }
}
