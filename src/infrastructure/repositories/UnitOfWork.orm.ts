import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountRepositoryOrm } from './AccountRepository.orm';
import { LedgerRepositoryOrm } from './LedgerRepository.orm';

@Injectable()
export class UnitOfWorkOrm implements UnitOfWork {
  constructor(
    private readonly ds: DataSource,
    public accounts: AccountRepositoryOrm,
    public ledger: LedgerRepositoryOrm,
  ) {}

  async withTransaction<T>(fn: (ctx: UnitOfWork) => Promise<T>): Promise<T> {
    return this.ds.transaction('SERIALIZABLE', async (m) => {
      const scoped = new UnitOfWorkOrm(this.ds, this.accounts, this.ledger);
      return fn(scoped);
    });
  }
}
