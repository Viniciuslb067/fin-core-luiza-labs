import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LedgerRepository } from '../../domain/ports/LedgerRepository';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { LedgerHeadOrm } from '../db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../db/entities/LedgerEntry.orm';
import { toDomainHead, toOrmEntry } from '../db/mappers/Ledger.mapper';

@Injectable()
export class LedgerRepositoryOrm implements LedgerRepository {
  constructor(private readonly ds: DataSource) {}

  async getHeadForUpdate(accountId: string) {
    const m = this.ds.manager;
    let head = await m
      .createQueryBuilder(LedgerHeadOrm, 'h')
      .setLock('pessimistic_write')
      .where('h.account_id = :id', { id: accountId })
      .getOne();

    if (!head) {
      head = m
        .getRepository(LedgerHeadOrm)
        .create({ account_id: accountId, head_hash: null, height: '0' });
      await m.getRepository(LedgerHeadOrm).save(head);
    }
    return toDomainHead(head);
  }

  async append(entry: LedgerEntry) {
    await this.ds.getRepository(LedgerEntryOrm).save(toOrmEntry(entry));
  }

  async advanceHead(headDomain, newHash: string) {
    const repo = this.ds.getRepository(LedgerHeadOrm);
    await repo.update(
      { account_id: headDomain.accountId },
      { head_hash: newHash, height: headDomain.height.toString() },
    );
  }
}
