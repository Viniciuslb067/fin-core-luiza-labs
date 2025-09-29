import { Injectable, Inject } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { computeLedgerHash } from '../../domain/services/ChainHasher';

@Injectable()
export class VerifyChainUseCase {
  constructor(@Inject('UnitOfWork') private readonly uow: UnitOfWork) {}

  async exec(accountNumber: string) {
    const num = AccountNumber.create(accountNumber);

    return this.uow.withTransaction(async (tx) => {
      const acc = await tx.accounts.findByNumber(num);
      if (!acc) return { ok: false as const, error: 'account not found' };

      const items = await tx.ledger.listByAccountAsc(acc.id);

      let prev: string | null = null;
      for (const it of items) {
        const recomputed = computeLedgerHash({
          accountNumber: num.value,
          type: it.type,
          amount: it.amount.toDecimal(),
          fee: it.fee.toDecimal(),
          occurredAtIso: it.occurredAt.date.toISOString(),
          prevHash: prev,
          description: it.description ?? null,
        });

        if (it.prevHash !== (prev ?? null) || it.hash !== recomputed) {
          return {
            ok: false as const,
            brokenAt: it.height.toString(),
            expectedPrev: prev,
            gotPrev: it.prevHash,
          };
        }
        prev = it.hash;
      }

      return {
        ok: true as const,
        height: items.at(-1)?.height.toString() ?? '0',
        head: prev,
      };
    });
  }
}
