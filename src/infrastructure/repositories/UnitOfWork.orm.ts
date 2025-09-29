import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountRepositoryOrm } from './AccountRepository.orm';
import { LedgerRepositoryOrm } from './LedgerRepository.orm';

@Injectable()
export class UnitOfWorkOrm implements UnitOfWork {
  public readonly accounts: AccountRepositoryOrm;
  public readonly ledger: LedgerRepositoryOrm;

  constructor(
    private readonly ds: DataSource,
    private readonly em: EntityManager,
  ) {
    this.accounts = new AccountRepositoryOrm(em);
    this.ledger = new LedgerRepositoryOrm(em);
  }

  async withTransaction<T>(fn: (ctx: this) => Promise<T>): Promise<T> {
    return this.ds.transaction('SERIALIZABLE', async (m) => {
      const scoped = new UnitOfWorkOrm(this.ds, m) as unknown as this;
      return fn(scoped);
    });
  }

  static fromDataSource(ds: DataSource) {
    return new UnitOfWorkOrm(ds, ds.manager);
  }
}
