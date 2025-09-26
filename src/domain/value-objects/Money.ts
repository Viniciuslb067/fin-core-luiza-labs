export class Money {
  private constructor(private readonly cents: bigint) {}

  static fromDecimal(n: number | string) {
    const v = typeof n === 'number' ? n.toFixed(2) : n;
    const cents = BigInt(v.replace('.', ''));
    return new Money(cents);
  }

  add(other: Money) {
    return new Money(this.cents + other.cents);
  }

  sub(other: Money) {
    return new Money(this.cents - other.cents);
  }

  gte(other: Money) {
    return this.cents >= other.cents;
  }

  toDecimal(): string {
    const s = this.cents.toString();
    const pad = s.padStart(3, '0');
    return `${pad.slice(0, -2)}.${pad.slice(-2)}`;
  }
}
