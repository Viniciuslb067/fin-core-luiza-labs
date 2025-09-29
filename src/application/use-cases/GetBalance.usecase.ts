import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';

type Params = { accountNumber: string };

@Injectable()
export class GetBalanceUseCase {
  constructor(@Inject('UnitOfWork') private readonly uow: UnitOfWork) {}

  async exec({ accountNumber }: Params) {
    return this.uow.withTransaction(async (tx) => {
      const num = AccountNumber.create(accountNumber);
      const acc = await tx.accounts.findByNumber(num);
      if (!acc) throw new NotFoundException('account not found');

      const head = await tx.ledger.getHead(acc.id);

      return {
        accountNumber: num.value,
        balance: acc.getBalance().toDecimal(),
        creditLimit: acc.getCreditLimit().toDecimal(),
        ledgerHead: head
          ? {
              height: head.height.toString(),
              hash: head.headHash,
            }
          : {
              height: '0',
              hash: null,
            },
      };
    });
  }
}
