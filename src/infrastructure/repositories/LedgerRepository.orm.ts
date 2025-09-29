import { EntityManager } from 'typeorm';
import { LedgerRepository } from '../../domain/ports/LedgerRepository';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { LedgerHeadOrm } from '../db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../db/entities/LedgerEntry.orm';
import {
  toDomainHead,
  toDomainEntry,
  toOrmEntry,
} from '../db/mappers/Ledger.mapper';

export class LedgerRepositoryOrm implements LedgerRepository {
  constructor(private readonly em: EntityManager) {}

  async getHead(accountId: string) {
    const head = await this.em.getRepository(LedgerHeadOrm).findOne({
      where: { account_id: accountId },
    });
    return head ? toDomainHead(head) : null;
  }

  async getHeadForUpdate(accountId: string) {
    let head = await this.em
      .getRepository(LedgerHeadOrm)
      .createQueryBuilder('h')
      .setLock('pessimistic_write')
      .where('h.account_id = :id', { id: accountId })
      .getOne();

    if (!head) {
      head = this.em
        .getRepository(LedgerHeadOrm)
        .create({ account_id: accountId, head_hash: null, height: '0' });
      await this.em.getRepository(LedgerHeadOrm).save(head);
    }
    return toDomainHead(head);
  }

  async append(entry: LedgerEntry) {
    await this.em.getRepository(LedgerEntryOrm).save(toOrmEntry(entry));
  }

  async advanceHead(head, newHash: string, newHeight: string) {
    await this.em
      .getRepository(LedgerHeadOrm)
      .update(
        { account_id: head.accountId },
        { head_hash: newHash, height: newHeight },
      );
  }

  async listByAccountAsc(accountId: string): Promise<LedgerEntry[]> {
    const rows = await this.em.getRepository(LedgerEntryOrm).find({
      where: { account: { id: accountId } as any },
      order: { height: 'ASC' },
    });
    return rows.map(toDomainEntry);
  }
}
