import { Controller, Get, Param, Query } from '@nestjs/common';
import { VerifyChainUseCase } from '../../application/use-cases/VerifyChain.usecase';
import { LedgerQueryDto } from '../../application/dto/audit.dto';
import { DataSource } from 'typeorm';
import { AccountOrm } from '../../infrastructure/db/entities/Account.orm';
import { LedgerEntryOrm } from '../../infrastructure/db/entities/LedgerEntry.orm';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly verifyUC: VerifyChainUseCase,
    private readonly ds: DataSource,
  ) {}

  @Get('verify/:accountNumber')
  async verify(@Param('accountNumber') accountNumber: string) {
    return this.verifyUC.exec(accountNumber);
  }

  @Get('ledger/:accountNumber')
  async ledger(
    @Param('accountNumber') accountNumber: string,
    @Query() q: LedgerQueryDto,
  ) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const offset = (page - 1) * limit;

    return this.ds.transaction('READ COMMITTED', async (m) => {
      const acc = await m
        .getRepository(AccountOrm)
        .findOne({ where: { number: accountNumber } });
      if (!acc) return { ok: false, error: 'account not found' };

      const qb = m
        .getRepository(LedgerEntryOrm)
        .createQueryBuilder('le')
        .where('le.account_id = :accId', { accId: acc.id });

      if (q.type) {
        qb.andWhere('le.type = :type', { type: q.type });
      }
      if (q.from) {
        qb.andWhere('le.occurred_at >= :from', { from: q.from });
      }
      if (q.to) {
        qb.andWhere('le.occurred_at < :to', { to: q.to });
      }

      qb.orderBy('le.height', 'ASC')
        .addOrderBy('le.occurred_at', 'ASC')
        .addOrderBy('le.id', 'ASC');

      const [items, total] = await qb
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return {
        ok: true,
        page,
        limit,
        total,
        items: items.map((it) => ({
          id: it.id,
          type: it.type,
          amount: it.amount,
          fee: it.fee,
          description: it.description,
          occurredAt: it.occurred_at,
          height: it.height,
          prevHash: it.prev_hash,
          hash: it.hash,
          relatedTxId: it.related_tx_id ?? null,
        })),
      };
    });
  }

  @Get('entry/:hash')
  async entryByHash(@Param('hash') hash: string) {
    return this.ds.transaction('READ COMMITTED', async (m) => {
      const it = await m.getRepository(LedgerEntryOrm).findOne({
        where: { hash },
        relations: { account: true },
      });
      if (!it) return { ok: false, error: 'entry not found' };

      return {
        ok: true,
        entry: {
          id: it.id,
          accountNumber: it.account.number,
          type: it.type,
          amount: it.amount,
          fee: it.fee,
          description: it.description,
          occurredAt: it.occurred_at,
          height: it.height,
          prevHash: it.prev_hash,
          hash: it.hash,
          relatedTxId: it.related_tx_id ?? null,
          createdAt: it.created_at,
        },
      };
    });
  }
}
