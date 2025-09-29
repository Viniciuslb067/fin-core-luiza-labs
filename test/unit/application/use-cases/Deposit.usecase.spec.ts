import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DepositUseCase } from '../../../../src/application/use-cases/Deposit.usecase';
import type { UnitOfWork } from '../../../../src/domain/ports/UnitOfWork';
import { Money } from '../../../../src/domain/value-objects/Money';

describe('DepositUseCase', () => {
  let useCase: DepositUseCase;
  let uow: jest.Mocked<UnitOfWork>;
  let tx: any;

  let mockAccount: any;

  beforeEach(async () => {
    mockAccount = {
      id: 'acc-001',
      getBalance: jest.fn(() => Money.fromDecimal(1000)),
      applyCredit: jest.fn(),
    };

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
      withTransaction: jest.fn(async (callback: any) => callback(tx)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositUseCase,
        { provide: 'UnitOfWork', useValue: uow },
      ],
    }).compile();

    useCase = module.get<DepositUseCase>(DepositUseCase);
  });

  describe('exec', () => {
    it('should execute deposit successfully', async () => {
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };

      const mockHead = {
        height: { inc: () => '6' },
        headHash: 'prev_hash',
      };

      (tx.accounts.findByNumber as jest.Mock).mockResolvedValue(mockAccount);
      (tx.ledger.getHeadForUpdate as jest.Mock).mockResolvedValue(mockHead);
      mockAccount.getBalance.mockReturnValue(Money.fromDecimal(1100));

      const result = await useCase.exec(params);

      expect(result).toBeDefined();
      expect(result.balance).toBe('1100.00');
      expect(result.hash).toBeDefined();
      expect(result.height).toBe('6');
      expect(tx.accounts.save).toHaveBeenCalledWith(mockAccount);
      expect(tx.ledger.append).toHaveBeenCalled();
      expect(tx.ledger.advanceHead).toHaveBeenCalled();
      expect(mockAccount.applyCredit).toHaveBeenCalledWith(Money.fromDecimal(100));
    });

    it('should throw error when amount is zero or negative', async () => {
      const params = {
        accountNumber: 'ACC001',
        amount: 0,
        description: 'Test deposit',
      };

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('amount must be > 0')
      );
    });

    it('should throw error when account not found', async () => {
      const params = {
        accountNumber: 'NONEXISTENT',
        amount: 100,
        description: 'Test deposit',
      };

      (tx.accounts.findByNumber as jest.Mock).mockResolvedValue(null);

      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('account not found')
      );
    });

    it('should handle deposit without description', async () => {
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
      };

      const mockHead = {
        height: { inc: () => '6' },
        headHash: 'prev_hash',
      };

      (tx.accounts.findByNumber as jest.Mock).mockResolvedValue(mockAccount);
      (tx.ledger.getHeadForUpdate as jest.Mock).mockResolvedValue(mockHead);
      mockAccount.getBalance.mockReturnValue(Money.fromDecimal(1100));

      const result = await useCase.exec(params);

      expect(result).toBeDefined();
      expect(result.balance).toBe('1100.00');
      expect(mockAccount.applyCredit).toHaveBeenCalledWith(Money.fromDecimal(100));
    });
  });
});