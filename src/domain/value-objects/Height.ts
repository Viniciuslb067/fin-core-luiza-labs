export class Height {
  private constructor(public readonly value: bigint) {}

  static zero() {
    return new Height(0n);
  }

  static from(v: string | number | bigint) {
    return new Height(BigInt(v));
  }

  inc() {
    return new Height(this.value + 1n);
  }

  toString() {
    return this.value.toString();
  }
}
