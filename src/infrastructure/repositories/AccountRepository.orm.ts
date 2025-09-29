import { EntityManager } from 'typeorm';
import { AccountRepository } from '../../domain/ports/AccountRepository';
import { AccountOrm } from '../db/entities/Account.orm';
import { toDomainAccount, toOrmAccount } from '../db/mappers/Account.mapper';
import { Account } from '../../domain/entities/Account';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';

export class AccountRepositoryOrm implements AccountRepository {
  constructor(private readonly em: EntityManager) {}

  async findByNumber(num: AccountNumber): Promise<Account | null> {
    const o = await this.em
      .getRepository(AccountOrm)
      .findOne({ where: { number: num.value } });
    return o ? toDomainAccount(o) : null;
  }

  async save(a: Account): Promise<void> {
    await this.em.getRepository(AccountOrm).save(toOrmAccount(a));
  }
}
