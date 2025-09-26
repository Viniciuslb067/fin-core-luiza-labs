import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRepository } from '../../domain/ports/AccountRepository';
import { Account } from '../../domain/entities/Account';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { AccountOrm } from '../db/entities/Account.orm';
import { toDomainAccount, toOrmAccount } from '../db/mappers/Account.mapper';

@Injectable()
export class AccountRepositoryOrm implements AccountRepository {
  constructor(private readonly ds: DataSource) {}

  async findByNumber(num: AccountNumber): Promise<Account | null> {
    const o = await this.ds
      .getRepository(AccountOrm)
      .findOne({ where: { number: num.value } });
    return o ? toDomainAccount(o) : null;
  }

  async save(account: Account): Promise<void> {
    await this.ds.getRepository(AccountOrm).save(toOrmAccount(account));
  }
}
