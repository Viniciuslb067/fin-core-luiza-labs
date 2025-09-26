// application/use-cases/VerifyChain.usecase.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { computeLedgerHash } from '../../domain/services/ChainHasher';

@Injectable()
export class VerifyChainUseCase {
  constructor(private readonly ds: DataSource) {}

  async exec(accountNumber: string) {
    return this.ds.transaction('READ COMMITTED', async (m) => {
      const acc = await m
        .getRepository(AccountOrm)
        .findOne({ where: { number: accountNumber } });
      if (!acc) return { ok: false, error: 'account not found' };

      const items = await m.getRepository(LedgerEntryOrm).find({
        where: { account: { id: acc.id } as any },
        order: { height: 'ASC' },
      });

      let prev: string | null = null;
      for (const it of items) {
        const recomputed = computeLedgerHash({
          accountNumber,
          type: it.type,
          amount: it.amount,
          fee: it.fee,
          occurredAtIso: it.occurred_at.toISOString(),
          prevHash: prev,
          description: it.description ?? null,
        });
        if (it.prev_hash !== (prev ?? null) || it.hash !== recomputed) {
          return {
            ok: false,
            brokenAt: it.height,
            expectedPrev: prev,
            gotPrev: it.prev_hash,
          };
        }
        prev = it.hash;
      }
      return { ok: true, height: items.at(-1)?.height ?? '0', head: prev };
    });
  }
}
