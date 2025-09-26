import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { VerifyChainUseCase } from '../../../../src/application/use-cases/VerifyChain.usecase';
import { AccountOrm } from '../../../../src/infrastructure/db/entities/Account.orm';
import { LedgerEntryOrm } from '../../../../src/infrastructure/db/entities/LedgerEntry.orm';

describe('VerifyChainUseCase', () => {
  let useCase: VerifyChainUseCase;
  let dataSource: DataSource;
  let entityManager: EntityManager;
  let accountRepository: Repository<AccountOrm>;
  let ledgerEntryRepository: Repository<LedgerEntryOrm>;

  const mockAccount: AccountOrm = {
    id: 1,
    number: 'ACC001',
    balance: '1000.00',
    credit_limit: '500.00',
    created_at: new Date(),
  } as AccountOrm;

  const mockLedgerEntries: LedgerEntryOrm[] = [
    {
      id: 1,
      account: mockAccount,
      type: 'DEPOSIT',
      amount: '100.00',
      fee: '0.00',
      description: 'Initial deposit',
      occurred_at: new Date('2024-01-01T10:00:00.000Z'),
      prev_hash: null,
      hash: 'hash1',
      height: '1',
      related_tx_id: null,
      created_at: new Date(),
    },
    {
      id: 2,
      account: mockAccount,
      type: 'TRANSFER_OUT',
      amount: '50.00',
      fee: '1.25',
      description: 'Transfer to ACC002',
      occurred_at: new Date('2024-01-01T11:00:00.000Z'),
      prev_hash: 'hash1',
      hash: 'hash2',
      height: '2',
      related_tx_id: 3,
      created_at: new Date(),
    },
  ] as LedgerEntryOrm[];

  beforeEach(async () => {
    const mockEntityManager = {
      getRepository: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyChainUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    useCase = module.get<VerifyChainUseCase>(VerifyChainUseCase);
    dataSource = module.get<DataSource>(DataSource);

    // Setup mocks
    entityManager = mockEntityManager as any;
    accountRepository = {
      findOne: jest.fn(),
    } as any;
    ledgerEntryRepository = {
      find: jest.fn(),
    } as any;

    entityManager.getRepository = jest.fn().mockImplementation((entity) => {
      if (entity === AccountOrm) return accountRepository;
      if (entity === LedgerEntryOrm) return ledgerEntryRepository;
      return {};
    });

    dataSource.transaction = jest.fn().mockImplementation((callback) => {
      return callback(entityManager);
    });
  });

  describe('exec', () => {
    it('should return success for valid chain', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(mockLedgerEntries);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: true,
        height: '2',
        head: 'hash2',
      });
    });

    it('should return error when account not found', async () => {
      // Arrange
      const accountNumber = 'NONEXISTENT';
      (accountRepository.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: false,
        error: 'account not found',
      });
    });

    it('should return success for empty chain', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: true,
        height: '0',
        head: null,
      });
    });

    it('should detect broken chain with wrong previous hash', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const brokenEntries = [
        {
          ...mockLedgerEntries[0],
          prev_hash: 'wrong_prev_hash', // This should be null
        },
        mockLedgerEntries[1],
      ];
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(brokenEntries);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: false,
        brokenAt: '1',
        expectedPrev: null,
        gotPrev: 'wrong_prev_hash',
      });
    });

    it('should detect broken chain with wrong hash', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const brokenEntries = [
        {
          ...mockLedgerEntries[0],
          hash: 'wrong_hash', // This should be the computed hash
        },
        mockLedgerEntries[1],
      ];
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(brokenEntries);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: false,
        brokenAt: '1',
        expectedPrev: null,
        gotPrev: null,
      });
    });

    it('should detect broken chain in middle of entries', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const brokenEntries = [
        mockLedgerEntries[0],
        {
          ...mockLedgerEntries[1],
          prev_hash: 'wrong_prev_hash', // Should be 'hash1'
        },
      ];
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(brokenEntries);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result).toEqual({
        ok: false,
        brokenAt: '2',
        expectedPrev: 'hash1',
        gotPrev: 'wrong_prev_hash',
      });
    });

    it('should order entries by height ascending', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const unorderedEntries = [mockLedgerEntries[1], mockLedgerEntries[0]]; // Wrong order
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(unorderedEntries);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(ledgerEntryRepository.find).toHaveBeenCalledWith({
        where: { account: { id: mockAccount.id } },
        order: { height: 'ASC' },
      });
    });

    it('should handle entries with null description', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const entriesWithNullDescription = [
        {
          ...mockLedgerEntries[0],
          description: null,
        },
      ];
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(entriesWithNullDescription);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle entries with undefined description', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const entriesWithUndefinedDescription = [
        {
          ...mockLedgerEntries[0],
          description: undefined,
        },
      ];
      
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(entriesWithUndefinedDescription);

      // Act
      const result = await useCase.exec(accountNumber);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should use READ COMMITTED transaction isolation', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      (accountRepository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryRepository.find as jest.Mock).mockResolvedValue(mockLedgerEntries);

      // Act
      await useCase.exec(accountNumber);

      // Assert
      expect(dataSource.transaction).toHaveBeenCalledWith('READ COMMITTED', expect.any(Function));
    });
  });
});
