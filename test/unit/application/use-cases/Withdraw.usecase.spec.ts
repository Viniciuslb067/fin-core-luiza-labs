import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WithdrawUseCase } from '../../../../src/application/use-cases/Withdraw.usecase';
import { AccountOrm } from '../../../../src/infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../../../src/infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../../../src/infrastructure/db/entities/LedgerEntry.orm';

describe('WithdrawUseCase', () => {
  let useCase: WithdrawUseCase;
  let dataSource: DataSource;
  let entityManager: EntityManager;
  let accountRepository: Repository<AccountOrm>;
  let ledgerHeadRepository: Repository<LedgerHeadOrm>;
  let ledgerEntryRepository: Repository<LedgerEntryOrm>;

  const mockAccount: AccountOrm = {
    id: 1,
    number: 'ACC001',
    balance: '1000.00',
    credit_limit: '500.00',
    created_at: new Date(),
  } as AccountOrm;

  const mockLedgerHead: LedgerHeadOrm = {
    id: 1,
    account_id: 1,
    head_hash: 'prev_hash',
    height: '5',
    created_at: new Date(),
  } as LedgerHeadOrm;

  beforeEach(async () => {
    const mockEntityManager = {
      getRepository: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<WithdrawUseCase>(WithdrawUseCase);
    dataSource = module.get<DataSource>(DataSource);

    // Setup mocks
    entityManager = mockEntityManager as any;
    accountRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;
    ledgerHeadRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;
    ledgerEntryRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    entityManager.getRepository = jest.fn().mockImplementation((entity) => {
      if (entity === AccountOrm) return accountRepository;
      if (entity === LedgerHeadOrm) return ledgerHeadRepository;
      if (entity === LedgerEntryOrm) return ledgerEntryRepository;
      return {};
    });

    entityManager.createQueryBuilder = jest.fn().mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    });

    dataSource.transaction = jest.fn().mockImplementation((callback) => {
      return callback(entityManager);
    });
  });

  describe('exec', () => {
    it('should execute withdraw successfully', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await useCase.exec(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.balance).toBe('898.50'); // 1000.00 - 100 - 1.5 (fee)
      expect(result.entryId).toBeDefined();
      expect(result.hash).toBeDefined();
      expect(accountRepository.save).toHaveBeenCalled();
      expect(ledgerEntryRepository.save).toHaveBeenCalled();
    });

    it('should throw error when amount is zero or negative', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 0,
        description: 'Test withdraw',
      };

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('amount must be > 0')
      );
    });

    it('should throw error when account not found', async () => {
      // Arrange
      const params = {
        accountNumber: 'NONEXISTENT',
        amount: 100,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('account not found')
      );
    });

    it('should throw error when insufficient funds', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 2000, // More than balance + credit limit
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('insufficient funds considering credit limit')
      );
    });

    it('should allow withdraw using credit limit', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 1200, // More than balance but within credit limit
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await useCase.exec(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.balance).toBe('-206.00'); // 1000.00 - 1200 - 6.0 (fee)
    });

    it('should handle withdraw without description', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await useCase.exec(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.balance).toBe('898.50');
    });
  });

  describe('calcFee', () => {
    it('should calculate fee correctly for different amounts', () => {
      // Access private method through any cast
      const calcFee = (useCase as any).calcFee;

      expect(calcFee(100)).toBe(1.5); // 1.0 + (100 * 0.005)
      expect(calcFee(1000)).toBe(6.0); // 1.0 + (1000 * 0.005)
      expect(calcFee(0)).toBe(1.0); // 1.0 + (0 * 0.005)
    });

    it('should round fee to 2 decimal places', () => {
      const calcFee = (useCase as any).calcFee;

      expect(calcFee(33.33)).toBe(1.17); // 1.0 + (33.33 * 0.005) = 1.16665 -> 1.17
    });
  });

  describe('execWithManager', () => {
    it('should create new ledger head if not exists', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(null); // No existing head
      (ledgerHeadRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      expect(ledgerHeadRepository.create).toHaveBeenCalledWith({
        account_id: 1,
        head_hash: null,
        height: '0',
      });
      expect(ledgerHeadRepository.save).toHaveBeenCalled();
    });

    it('should update account balance correctly with fee', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 250.75,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      const expectedFee = 1.0 + (250.75 * 0.005); // 2.25
      const expectedBalance = 1000.00 - 250.75 - expectedFee; // 747.00
      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          balance: expectedBalance.toFixed(2),
        })
      );
    });

    it('should create ledger entry with correct data including fee', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      expect(ledgerEntryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockAccount,
          type: 'WITHDRAW',
          amount: '100.00',
          fee: '1.50', // 1.0 + (100 * 0.005)
          description: 'Test withdraw',
          prev_hash: 'prev_hash',
          height: '6', // 5 + 1
        })
      );
    });

    it('should check available funds including credit limit', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      const accountWithLowBalance: AccountOrm = {
        ...mockAccount,
        balance: '50.00',
        credit_limit: '100.00',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(accountWithLowBalance);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      // Should succeed because 50 + 100 = 150 >= 100 + 1.5 = 101.5
      expect(accountRepository.save).toHaveBeenCalled();
    });

    it('should use SERIALIZABLE transaction isolation', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.exec(params);

      // Assert
      expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
    });
  });
});
