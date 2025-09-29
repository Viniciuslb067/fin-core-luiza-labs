import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { UnitOfWork } from '../../domain/ports/UnitOfWork';
import { AccountNumber } from '../../domain/value-objects/AccountNumber';
import { Money } from '../../domain/value-objects/Money';
import { OccurredAt } from '../../domain/value-objects/OccurredAt';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { computeLedgerHash } from '../../domain/services/ChainHasher';
import { OperationType } from '../../domain/enums/OperationType';
import { randomUUID } from 'node:crypto';
import type { FeePolicy } from 'src/domain/ports/FeePolicy';

type Params = {
  from: string;
  to: string;
  amount: number;
  description?: string;
};

@Injectable()
export class TransferUseCase {
  constructor(
    @Inject('UnitOfWork') private readonly uow: UnitOfWork,
    @Inject('FeePolicy') private readonly fees: FeePolicy,
  ) {}

  exec(params: Params) {
    return this.uow.withTransaction((tx) => this.execIn(tx, params));
  }

  async execIn(tx: UnitOfWork, { from, to, amount, description }: Params) {
    if (from === to) throw new BadRequestException('from and to must differ');
    if (amount <= 0) throw new BadRequestException('amount must be > 0');

    const fromNum = AccountNumber.create(from);
    const toNum = AccountNumber.create(to);

    const origin = await tx.accounts.findByNumber(fromNum);
    const dest = await tx.accounts.findByNumber(toNum);
    if (!origin || !dest) throw new BadRequestException('account(s) not found');

    const amt = Money.fromDecimal(amount);
    const fee = this.fees.calculate(amt, OperationType.TRANSFER_OUT);

    if (!origin.canDebit(amt, fee)) {
      throw new BadRequestException(
        'insufficient funds considering credit limit',
      );
    }

    const [first, second] =
      origin.id < dest.id ? [origin, dest] : [dest, origin];
    const firstHead = await tx.ledger.getHeadForUpdate(first.id);
    const secondHead = await tx.ledger.getHeadForUpdate(second.id);

    const oHead = first.id === origin.id ? firstHead : secondHead;
    const dHead = first.id === origin.id ? secondHead : firstHead;

    origin.applyDebit(amt, fee);
    dest.applyCredit(amt);
    await tx.accounts.save(origin);
    await tx.accounts.save(dest);

    const occurredAt = OccurredAt.now();
    const amountStr = amt.toDecimal();
    const feeStr = fee.toDecimal();

    const outId = randomUUID();
    const inId = randomUUID();

    const outHeight = oHead.height.inc();
    const inHeight = dHead.height.inc();

    const outHash = computeLedgerHash({
      accountNumber: fromNum.value,
      type: OperationType.TRANSFER_OUT,
      amount: amountStr,
      fee: feeStr,
      occurredAtIso: occurredAt.date.toISOString(),
      prevHash: oHead.headHash,
      description: description ?? null,
    });

    const inHash = computeLedgerHash({
      accountNumber: toNum.value,
      type: OperationType.TRANSFER_IN,
      amount: amountStr,
      fee: '0.00',
      occurredAtIso: occurredAt.date.toISOString(),
      prevHash: dHead.headHash,
      description: description ?? null,
    });

    const outEntry = new LedgerEntry(
      outId,
      origin.id,
      OperationType.TRANSFER_OUT,
      amt,
      fee,
      occurredAt,
      description ?? null,
      oHead.headHash,
      outHash,
      outHeight,
      inId,
    );

    const inEntry = new LedgerEntry(
      inId,
      dest.id,
      OperationType.TRANSFER_IN,
      amt,
      Money.fromDecimal(0),
      occurredAt,
      description ?? null,
      dHead.headHash,
      inHash,
      inHeight,
      outId,
    );

    await tx.ledger.append(outEntry);
    await tx.ledger.append(inEntry);

    await tx.ledger.advanceHead(oHead, outHash, outHeight.toString());
    await tx.ledger.advanceHead(dHead, inHash, inHeight.toString());

    return {
      outTxId: outId,
      inTxId: inId,
      originAfter: origin.getBalance().toDecimal(),
      destAfter: dest.getBalance().toDecimal(),
      outHash,
      inHash,
      outHeight: outHeight.toString(),
      inHeight: inHeight.toString(),
    };
  }
}
