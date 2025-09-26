import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DepositUseCase } from '../../../../src/application/use-cases/Deposit.usecase';
import { AccountOrm } from '../../../../src/infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../../../src/infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../../../src/infrastructure/db/entities/LedgerEntry.orm';

describe('DepositUseCase', () => {
  let useCase: DepositUseCase;
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
        DepositUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<DepositUseCase>(DepositUseCase);
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
    it('should execute deposit successfully', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      const result = await useCase.exec(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.balance).toBe('1100.00');
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
        description: 'Test deposit',
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
        description: 'Test deposit',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.exec(params)).rejects.toThrow(
        new BadRequestException('account not found')
      );
    });

    it('should handle deposit without description', async () => {
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
      expect(result.balance).toBe('1100.00');
    });
  });

  describe('execWithManager', () => {
    it('should create new ledger head if not exists', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
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

    it('should update account balance correctly', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 250.75,
        description: 'Test deposit',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1 });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      expect(accountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          balance: '1250.75', // 1000.00 + 250.75
        })
      );
    });

    it('should create ledger entry with correct data', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
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
          type: 'DEPOSIT',
          amount: '100.00',
          fee: '0.00',
          description: 'Test deposit',
          prev_hash: 'prev_hash',
          height: '6', // 5 + 1
        })
      );
    });

    it('should update ledger head after creating entry', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };

      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (entityManager.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(mockLedgerHead);
      (ledgerEntryRepository.create as jest.Mock).mockReturnValue({ id: 1, hash: 'new_hash' });
      (ledgerEntryRepository.save as jest.Mock).mockResolvedValue({ id: 1 });

      // Act
      await useCase.execWithManager(entityManager, params);

      // Assert
      expect(ledgerHeadRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          head_hash: 'new_hash',
          height: '6',
        })
      );
    });

    it('should use SERIALIZABLE transaction isolation', async () => {
      // Arrange
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
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
