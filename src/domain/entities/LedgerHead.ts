import { Height } from '../value-objects/Height';

export class LedgerHead {
  constructor(
    public readonly accountId: string,
    public headHash: string | null,
    public height: Height,
  ) {}

  advance(newHash: string) {
    this.headHash = newHash;
    this.height = this.height.inc();
  }
}
