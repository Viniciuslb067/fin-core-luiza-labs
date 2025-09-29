import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { TransferUseCase } from '../../../../src/application/use-cases/Transfer.usecase';
import type { UnitOfWork } from '../../../../src/domain/ports/UnitOfWork';
import type { FeePolicy } from '../../../../src/domain/ports/FeePolicy';
import { Money } from '../../../../src/domain/value-objects/Money';
import { OperationType } from '../../../../src/domain/enums/OperationType';

const toNumber = (m: Money) => parseFloat(m.toDecimal());

describe('TransferUseCase', () => {
  let useCase: TransferUseCase;
  let uow: jest.Mocked<UnitOfWork>;
  let tx: any;
  let fees: jest.Mocked<FeePolicy>;

  let acc1: { id: string; number: string; balance: number; creditLimit: number };
  let acc2: { id: string; number: string; balance: number; creditLimit: number };

  const makeDomainAccount = (state: { id: string; number: string; balance: number; creditLimit: number }) => ({
    id: state.id,
    number: state.number,
    canDebit: (amt: Money, fee: Money) => {
      const total = toNumber(amt) + toNumber(fee);
      return state.balance - total >= -state.creditLimit;
    },
    applyDebit: (amt: Money, fee: Money) => {
      const total = toNumber(amt) + toNumber(fee);
      state.balance = +(state.balance - total).toFixed(2);
    },
    applyCredit: (amt: Money) => {
      state.balance = +(state.balance + toNumber(amt)).toFixed(2);
    },
    getBalance: () => Money.fromDecimal(state.balance),
  });

  const makeHead = (accountId: string, currentHeight: bigint, headHash: string) => ({
    accountId,
    headHash,
    height: {
      inc: () => currentHeight + 1n,
      toString: () => currentHeight.toString(),
    },
  });

  beforeEach(async () => {
    acc1 = { id: '1', number: 'ACC001', balance: 1000.0, creditLimit: 500.0 };
    acc2 = { id: '2', number: 'ACC002', balance: 500.0, creditLimit: 200.0 };

    tx = {
      accounts: {
        findByNumber: jest.fn(),
        save: jest.fn(),
      },
      ledger: {
        getHeadForUpdate: jest.fn(),
        append: jest.fn(),
        advanceHead: jest.fn(),
      },
    };

    uow = {
      withTransaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    fees = {
      calculate: jest.fn((amt, op: OperationType) => {
        const a = toNumber(amt);
        const fee = op === OperationType.TRANSFER_OUT ? 1.0 + a * 0.005 : 0;
        return Money.fromDecimal(+fee.toFixed(2));
      }),
    } as any;

    (tx.accounts.findByNumber as jest.Mock).mockImplementation(async (numVO: any) => {
      if (numVO.value === acc1.number) return makeDomainAccount(acc1);
      if (numVO.value === acc2.number) return makeDomainAccount(acc2);
      return null;
    });

    (tx.ledger.getHeadForUpdate as jest.Mock).mockImplementation(async (accountId: string) => {
      if (accountId === acc1.id) return makeHead(acc1.id, 5n, 'prev_hash_1');
      if (accountId === acc2.id) return makeHead(acc2.id, 3n, 'prev_hash_2');
      throw new Error('unknown account id in getHeadForUpdate');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferUseCase,
        { provide: 'UnitOfWork', useValue: uow },
        { provide: 'FeePolicy', useValue: fees },
      ],
    }).compile();

    useCase = module.get<TransferUseCase>(TransferUseCase);
  });

  describe('exec', () => {
    it('should execute transfer successfully', async () => {
      const params = { from: 'ACC001', to: 'ACC002', amount: 100, description: 'Test transfer' };

      const result = await useCase.exec(params);

      expect(result).toBeDefined();
      expect(result.outTxId).toBeDefined();
      expect(result.inTxId).toBeDefined();
      expect(result.outHash).toBeDefined();
      expect(result.inHash).toBeDefined();
      expect(result.originAfter).toBe('898.50'); // 1000 - 100 - 1.5
      expect(result.destAfter).toBe('600.00');   // 500 + 100
      expect(result.outHeight).toBe('6'); // 5 -> inc() = 6
      expect(result.inHeight).toBe('4');  // 3 -> inc() = 4

      expect(tx.accounts.save).toHaveBeenCalledTimes(2);
      expect(tx.ledger.append).toHaveBeenCalledTimes(2);
      expect(tx.ledger.advanceHead).toHaveBeenCalledTimes(2);
    });

    it('should throw error when from and to accounts are the same', async () => {
      const params = { from: 'ACC001', to: 'ACC001', amount: 100, description: 'Test transfer' };

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('from and to must differ'),
      );
    });

    it('should throw error when amount is zero or negative', async () => {
      const params = { from: 'ACC001', to: 'ACC002', amount: 0, description: 'Test transfer' };

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('amount must be > 0'),
      );
    });

    it('should throw error when account not found', async () => {
      const params = { from: 'ACC001', to: 'ACCXXX', amount: 100, description: 'Test transfer' };

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('account(s) not found'),
      );
    });

    it('should throw error when insufficient funds', async () => {
      const params = { from: 'ACC001', to: 'ACC002', amount: 2000, description: 'Test transfer' };

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('insufficient funds considering credit limit')
      );
    });
  });
});
