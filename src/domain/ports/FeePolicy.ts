import { Money } from '../value-objects/Money';
import { OperationType } from '../enums/OperationType';

export interface FeePolicy {
  calculate(amount: Money, op: OperationType): Money;
}
