export class AccountNumber {
  private constructor(public readonly value: string) {}
  static create(v: string) {
    if (!v || v.length < 3) throw new Error('invalid account number');
    return new AccountNumber(v);
  }
}