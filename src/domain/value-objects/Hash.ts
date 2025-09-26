export class Hash {
  private constructor(public readonly value: string) {}

  static create(v: string) {
    if (v && v.length !== 64) throw new Error('invalid hash');
    return new Hash(v ?? (null as any));
  }
}
