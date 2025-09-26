import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { TransferUseCase } from '../../../src/application/use-cases/Transfer.usecase';
import { AccountOrm } from '../../../src/infrastructure/db/entities/Account.orm';
import { LedgerHeadOrm } from '../../../src/infrastructure/db/entities/LedgerHead.orm';
import { LedgerEntryOrm } from '../../../src/infrastructure/db/entities/LedgerEntry.orm';
import { dataSourceOptions } from '../../../src/infrastructure/db/typeorm.config';

describe('TransferUseCase Integration Tests', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let transferUseCase: TransferUseCase;
  let accountRepository: any;
  let ledgerHeadRepository: any;
  let ledgerEntryRepository: any;

  beforeAll(async () => {
    // Create test database connection
    const testDataSourceOptions = {
      ...dataSourceOptions,
      database: 'fincore_test',
      synchronize: true, // Only for tests
      logging: false,
    };

    dataSource = new DataSource(testDataSourceOptions);
    await dataSource.initialize();

    module = await Test.createTestingModule({
      providers: [
        TransferUseCase,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    transferUseCase = module.get<TransferUseCase>(TransferUseCase);
    accountRepository = dataSource.getRepository(AccountOrm);
    ledgerHeadRepository = dataSource.getRepository(LedgerHeadOrm);
    ledgerEntryRepository = dataSource.getRepository(LedgerEntryOrm);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await ledgerEntryRepository.delete({});
    await ledgerHeadRepository.delete({});
    await accountRepository.delete({});
  });

  describe('Transfer Integration', () => {
    it('should execute complete transfer flow with database', async () => {
      // Arrange - Create test accounts
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '1000.00',
        credit_limit: '500.00',
      });
      const account2 = accountRepository.create({
        number: 'ACC002',
        balance: '500.00',
        credit_limit: '200.00',
      });
      await accountRepository.save([account1, account2]);

      // Act
      const result = await transferUseCase.exec({
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Integration test transfer',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.outTxId).toBeDefined();
      expect(result.inTxId).toBeDefined();
      expect(result.originAfter).toBe('898.50'); // 1000 - 100 - 1.5 (fee)
      expect(result.destAfter).toBe('600.00'); // 500 + 100

      // Verify accounts were updated
      const updatedAccount1 = await accountRepository.findOne({ where: { number: 'ACC001' } });
      const updatedAccount2 = await accountRepository.findOne({ where: { number: 'ACC002' } });
      
      expect(updatedAccount1.balance).toBe('898.50');
      expect(updatedAccount2.balance).toBe('600.00');

      // Verify ledger entries were created
      const entries = await ledgerEntryRepository.find({
        where: [
          { account: { number: 'ACC001' } },
          { account: { number: 'ACC002' } }
        ],
        order: { height: 'ASC' }
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('TRANSFER_OUT');
      expect(entries[0].amount).toBe('100.00');
      expect(entries[0].fee).toBe('1.50');
      expect(entries[1].type).toBe('TRANSFER_IN');
      expect(entries[1].amount).toBe('100.00');
      expect(entries[1].fee).toBe('0.00');

      // Verify ledger heads were updated
      const head1 = await ledgerHeadRepository.findOne({ where: { account_id: account1.id } });
      const head2 = await ledgerHeadRepository.findOne({ where: { account_id: account2.id } });
      
      expect(head1).toBeDefined();
      expect(head1.height).toBe('1');
      expect(head2).toBeDefined();
      expect(head2.height).toBe('1');
    });

    it('should handle insufficient funds scenario', async () => {
      // Arrange
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '50.00',
        credit_limit: '100.00',
      });
      const account2 = accountRepository.create({
        number: 'ACC002',
        balance: '500.00',
        credit_limit: '200.00',
      });
      await accountRepository.save([account1, account2]);

      // Act & Assert
      await expect(
        transferUseCase.exec({
          from: 'ACC001',
          to: 'ACC002',
          amount: 200, // More than available (50 + 100 = 150)
          description: 'Should fail',
        })
      ).rejects.toThrow(BadRequestException);

      // Verify no changes were made
      const unchangedAccount1 = await accountRepository.findOne({ where: { number: 'ACC001' } });
      const unchangedAccount2 = await accountRepository.findOne({ where: { number: 'ACC002' } });
      
      expect(unchangedAccount1.balance).toBe('50.00');
      expect(unchangedAccount2.balance).toBe('500.00');

      // Verify no ledger entries were created
      const entries = await ledgerEntryRepository.find();
      expect(entries).toHaveLength(0);
    });

    it('should maintain data consistency with concurrent transfers', async () => {
      // Arrange
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '1000.00',
        credit_limit: '500.00',
      });
      const account2 = accountRepository.create({
        number: 'ACC002',
        balance: '500.00',
        credit_limit: '200.00',
      });
      await accountRepository.save([account1, account2]);

      // Act - Execute multiple transfers concurrently
      const transfer1 = transferUseCase.exec({
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Transfer 1',
      });

      const transfer2 = transferUseCase.exec({
        from: 'ACC001',
        to: 'ACC002',
        amount: 50,
        description: 'Transfer 2',
      });

      const results = await Promise.all([transfer1, transfer2]);

      // Assert
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.outTxId).toBeDefined();
        expect(result.inTxId).toBeDefined();
      });

      // Verify final balances
      const finalAccount1 = await accountRepository.findOne({ where: { number: 'ACC001' } });
      const finalAccount2 = await accountRepository.findOne({ where: { number: 'ACC002' } });
      
      // Account1: 1000 - 100 - 1.5 - 50 - 1.25 = 847.25
      expect(finalAccount1.balance).toBe('847.25');
      // Account2: 500 + 100 + 50 = 650
      expect(finalAccount2.balance).toBe('650.00');

      // Verify all ledger entries were created
      const entries = await ledgerEntryRepository.find({
        order: { height: 'ASC' }
      });
      expect(entries).toHaveLength(4); // 2 transfers = 4 entries
    });

    it('should handle account not found scenario', async () => {
      // Arrange - Only create one account
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '1000.00',
        credit_limit: '500.00',
      });
      await accountRepository.save([account1]);

      // Act & Assert
      await expect(
        transferUseCase.exec({
          from: 'ACC001',
          to: 'NONEXISTENT',
          amount: 100,
          description: 'Should fail',
        })
      ).rejects.toThrow(BadRequestException);

      // Verify no changes were made
      const unchangedAccount1 = await accountRepository.findOne({ where: { number: 'ACC001' } });
      expect(unchangedAccount1.balance).toBe('1000.00');
    });

    it('should validate same account transfer prevention', async () => {
      // Arrange
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '1000.00',
        credit_limit: '500.00',
      });
      await accountRepository.save([account1]);

      // Act & Assert
      await expect(
        transferUseCase.exec({
          from: 'ACC001',
          to: 'ACC001',
          amount: 100,
          description: 'Should fail',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate amount must be positive', async () => {
      // Arrange
      const account1 = accountRepository.create({
        number: 'ACC001',
        balance: '1000.00',
        credit_limit: '500.00',
      });
      const account2 = accountRepository.create({
        number: 'ACC002',
        balance: '500.00',
        credit_limit: '200.00',
      });
      await accountRepository.save([account1, account2]);

      // Act & Assert
      await expect(
        transferUseCase.exec({
          from: 'ACC001',
          to: 'ACC002',
          amount: 0,
          description: 'Should fail',
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        transferUseCase.exec({
          from: 'ACC001',
          to: 'ACC002',
          amount: -100,
          description: 'Should fail',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
