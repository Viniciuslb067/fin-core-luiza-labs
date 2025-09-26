import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from '../../../../src/interfaces/http/transactions.controller';
import { DepositUseCase } from '../../../../src/application/use-cases/Deposit.usecase';
import { WithdrawUseCase } from '../../../../src/application/use-cases/Withdraw.usecase';
import { TransferUseCase } from '../../../../src/application/use-cases/Transfer.usecase';
import { ProcessBatchUseCase } from '../../../../src/application/use-cases/ProcessBatch.usecase';
import { VerifyChainUseCase } from '../../../../src/application/use-cases/VerifyChain.usecase';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let depositUseCase: DepositUseCase;
  let withdrawUseCase: WithdrawUseCase;
  let transferUseCase: TransferUseCase;
  let processBatchUseCase: ProcessBatchUseCase;
  let verifyChainUseCase: VerifyChainUseCase;

  beforeEach(async () => {
    const mockDepositUseCase = {
      exec: jest.fn(),
    };

    const mockWithdrawUseCase = {
      exec: jest.fn(),
    };

    const mockTransferUseCase = {
      exec: jest.fn(),
    };

    const mockProcessBatchUseCase = {
      exec: jest.fn(),
    };

    const mockVerifyChainUseCase = {
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: DepositUseCase,
          useValue: mockDepositUseCase,
        },
        {
          provide: WithdrawUseCase,
          useValue: mockWithdrawUseCase,
        },
        {
          provide: TransferUseCase,
          useValue: mockTransferUseCase,
        },
        {
          provide: ProcessBatchUseCase,
          useValue: mockProcessBatchUseCase,
        },
        {
          provide: VerifyChainUseCase,
          useValue: mockVerifyChainUseCase,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    depositUseCase = module.get<DepositUseCase>(DepositUseCase);
    withdrawUseCase = module.get<WithdrawUseCase>(WithdrawUseCase);
    transferUseCase = module.get<TransferUseCase>(TransferUseCase);
    processBatchUseCase = module.get<ProcessBatchUseCase>(ProcessBatchUseCase);
    verifyChainUseCase = module.get<VerifyChainUseCase>(VerifyChainUseCase);
  });

  describe('deposit', () => {
    it('should call deposit use case with correct parameters', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };
      const idempotencyKey = 'test-key-123';
      const expectedResult = { balance: '1100.00', entryId: 1, hash: 'hash123' };
      
      (depositUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.deposit(dto, idempotencyKey);

      // Assert
      expect(depositUseCase.exec).toHaveBeenCalledWith({
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle deposit without idempotency key', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };
      const expectedResult = { balance: '1100.00', entryId: 1, hash: 'hash123' };
      
      (depositUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.deposit(dto);

      // Assert
      expect(depositUseCase.exec).toHaveBeenCalledWith({
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle deposit without description', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
      };
      const expectedResult = { balance: '1100.00', entryId: 1, hash: 'hash123' };
      
      (depositUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.deposit(dto);

      // Assert
      expect(depositUseCase.exec).toHaveBeenCalledWith({
        accountNumber: 'ACC001',
        amount: 100,
        description: undefined,
      });
      expect(result).toBe(expectedResult);
    });
  });

  describe('withdraw', () => {
    it('should call withdraw use case with correct parameters', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };
      const idempotencyKey = 'test-key-456';
      const expectedResult = { balance: '898.50', entryId: 2, hash: 'hash456' };
      
      (withdrawUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.withdraw(dto, idempotencyKey);

      // Assert
      expect(withdrawUseCase.exec).toHaveBeenCalledWith({
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle withdraw without idempotency key', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };
      const expectedResult = { balance: '898.50', entryId: 2, hash: 'hash456' };
      
      (withdrawUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.withdraw(dto);

      // Assert
      expect(withdrawUseCase.exec).toHaveBeenCalledWith({
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      });
      expect(result).toBe(expectedResult);
    });
  });

  describe('transfer', () => {
    it('should call transfer use case with correct parameters', async () => {
      // Arrange
      const dto = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      };
      const idempotencyKey = 'test-key-789';
      const expectedResult = {
        outTxId: 1,
        inTxId: 2,
        originAfter: '898.50',
        destAfter: '600.00',
      };
      
      (transferUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.transfer(dto, idempotencyKey);

      // Assert
      expect(transferUseCase.exec).toHaveBeenCalledWith({
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle transfer without idempotency key', async () => {
      // Arrange
      const dto = {
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      };
      const expectedResult = {
        outTxId: 1,
        inTxId: 2,
        originAfter: '898.50',
        destAfter: '600.00',
      };
      
      (transferUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.transfer(dto);

      // Assert
      expect(transferUseCase.exec).toHaveBeenCalledWith({
        from: 'ACC001',
        to: 'ACC002',
        amount: 100,
        description: 'Test transfer',
      });
      expect(result).toBe(expectedResult);
    });
  });

  describe('processBatch', () => {
    it('should call process batch use case with correct parameters', async () => {
      // Arrange
      const dto = {
        items: [
          { type: 'DEPOSIT', accountNumber: 'ACC001', amount: 100 },
          { type: 'WITHDRAW', accountNumber: 'ACC002', amount: 50 },
        ],
      };
      const idempotencyKey = 'test-key-batch';
      const expectedResult = { processed: 2, failed: 0 };
      
      (processBatchUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.processBatch(dto, idempotencyKey);

      // Assert
      expect(processBatchUseCase.exec).toHaveBeenCalledWith(dto.items);
      expect(result).toBe(expectedResult);
    });

    it('should handle batch processing without idempotency key', async () => {
      // Arrange
      const dto = {
        items: [
          { type: 'DEPOSIT', accountNumber: 'ACC001', amount: 100 },
        ],
      };
      const expectedResult = { processed: 1, failed: 0 };
      
      (processBatchUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.processBatch(dto);

      // Assert
      expect(processBatchUseCase.exec).toHaveBeenCalledWith(dto.items);
      expect(result).toBe(expectedResult);
    });
  });

  describe('verify', () => {
    it('should call verify chain use case with account number', async () => {
      // Arrange
      const accountNumber = 'ACC001';
      const expectedResult = { ok: true, height: '5', head: 'hash123' };
      
      (verifyChainUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.verify(accountNumber);

      // Assert
      expect(verifyChainUseCase.exec).toHaveBeenCalledWith('ACC001');
      expect(result).toBe(expectedResult);
    });

    it('should handle verification failure', async () => {
      // Arrange
      const accountNumber = 'NONEXISTENT';
      const expectedResult = { ok: false, error: 'account not found' };
      
      (verifyChainUseCase.exec as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await controller.verify(accountNumber);

      // Assert
      expect(verifyChainUseCase.exec).toHaveBeenCalledWith('NONEXISTENT');
      expect(result).toBe(expectedResult);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from use cases', async () => {
      // Arrange
      const dto = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test deposit',
      };
      const error = new Error('Database connection failed');
      
      (depositUseCase.exec as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deposit(dto)).rejects.toThrow('Database connection failed');
    });

    it('should handle validation errors', async () => {
      // Arrange
      const dto = {
        from: 'ACC001',
        to: 'ACC001', // Same account
        amount: 100,
        description: 'Test transfer',
      };
      const error = new Error('from and to must differ');
      
      (transferUseCase.exec as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(controller.transfer(dto)).rejects.toThrow('from and to must differ');
    });
  });
});
