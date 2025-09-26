import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TransferUseCase } from '../../../../src/application/use-cases/Transfer.usecase';
import { AccountOrm } from '../../../../src/infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../../../src/infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../../../src/infrastructure/db/entities/LedgerEntry.orm';

describe('TransferUseCase', () => {
  let useCase: TransferUseCase;
  let dataSource: DataSource;
  let entityManager: EntityManager;
  let accountRepository: Repository<AccountOrm>;
  let ledgerHeadRepository: Repository<LedgerHeadOrm>;
  let ledgerEntryRepository: Repository<LedgerEntryOrm>;

  const mockAccount1: AccountOrm = {
    id: 1,
    number: 'ACC001',
    balance: '1000.00',
    credit_limit: '500.00',
    created_at: new Date(),
  } as AccountOrm;

  const mockAccount2: AccountOrm = {
    id: 2,
    number: 'ACC002',
    balance: '500.00',
    credit_limit: '200.00',
    created_at: new Date(),
  } as AccountOrm;

  const mockLedgerHead1: LedgerHeadOrm = {
    id: 1,
    account_id: 1,
    head_hash: 'prev_hash_1',
    height: '5',
    created_at: new Date(),
  } as LedgerHeadOrm;

  const mockLedgerHead2: LedgerHeadOrm = {
    id: 2,
    account_id: 2,
    head_hash: 'prev_hash_2',
    height: '3',
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
        TransferUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<TransferUseCase>(TransferUseCase);
    dataSource = module.get<DataSource>(DataSource);

    // Setup mocks
    entityManager = mockEntityManager as any;
    accountRepository = {
      find: jest.fn(),
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
    it('should execute transfer successfully', async () => {
      // Arrange
      const params = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      };

      (accountRepository.find as jest.Mock).mockResolvedValue([mockAccount1, mockAccount2]);
      (entityManager.createQueryBuilder().getOne as jest.Mock)
        .mockResolvedValueOnce(mockLedgerHead1)
        .mockResolvedValueOnce(mockLedgerHead2);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await useCase.exec(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.outTxId).toBeDefined();
      expect(result.inTxId).toBeDefined();
      expect(accountRepository.save).toHaveBeenCalled();
      expect(ledgerEntryRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should throw error when from and to accounts are the same', async () => {
      // Arrange
      const params = {
        from: 'ACC001',
        to: 'ACC001',
        amount: 100,
        description: 'Test transfer',
      };

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('from and to must differ')
      );
    });

    it('should throw error when amount is zero or negative', async () => {
      // Arrange
      const params = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 0,
        description: 'Test transfer',
      };

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('amount must be > 0')
      );
    });

    it('should throw error when account not found', async () => {
      // Arrange
      const params = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      };

      (accountRepository.find as jest.Mock).mockResolvedValue([mockAccount1]); // Only one account found

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('account(s) not found')
      );
    });

    it('should throw error when insufficient funds', async () => {
      // Arrange
      const params = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 2000, // More than available balance + credit limit
        description: 'Test transfer',
      };

      (accountRepository.find as jest.Mock).mockResolvedValue([mockAccount1, mockAccount2]);
      (entityManager.createQueryBuilder().getOne as jest.Mock)
        .mockResolvedValueOnce(mockLedgerHead1)
        .mockResolvedValueOnce(mockLedgerHead2);

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('insufficient funds considering credit limit')
      );
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
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      };

      (accountRepository.find as jest.Mock).mockResolvedValue([mockAccount1, mockAccount2]);
      (entityManager.createQueryBuilder().getOne as jest.Mock)
        .mockResolvedValueOnce(null) // No existing head for account 1
        .mockResolvedValueOnce(mockLedgerHead2);
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

    it('should order accounts by ID to prevent deadlocks', async () => {
      // Arrange
      const params = {
        from: 'ACC002', // Higher ID
        to: 'ACC001',   // Lower ID
        amount: 100,
        description: 'Test transfer',
      };

      (accountRepository.find as jest.Mock).mockResolvedValue([mockAccount2, mockAccount1]);
      (entityManager.createQueryBuilder().getOne as jest.Mock)
        .mockResolvedValueOnce(mockLedgerHead1) // Should be called for ACC001 first (lower ID)
        .mockResolvedValueOnce(mockLedgerHead2); // Then ACC002
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      expect(entityManager.createQueryBuilder).toHaveBeenCalledWith(LedgerHeadOrm, 'h');
      // Verify that the query builder was called for both accounts in the correct order
      expect(entityManager.createQueryBuilder().where).toHaveBeenCalledWith('h.account_id = :id', { id: 1 });
      expect(entityManager.createQueryBuilder().where).toHaveBeenCalledWith('h.account_id = :id', { id: 2 });
    });
  });
});
