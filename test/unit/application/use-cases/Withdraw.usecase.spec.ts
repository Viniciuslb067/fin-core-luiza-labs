// test/application/use-cases/Withdraw.usecase.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { WithdrawUseCase } from '../../../../src/application/use-cases/Withdraw.usecase';
import type { UnitOfWork } from '../../../../src/domain/ports/UnitOfWork';
import type { FeePolicy } from '../../../../src/domain/ports/FeePolicy';
import { Money } from '../../../../src/domain/value-objects/Money';
import { OperationType } from '../../../../src/domain/enums/OperationType';

// Helpers para montar Money em número
const toNumber = (m: Money) => parseFloat(m.toDecimal());

describe('WithdrawUseCase (v2 - UoW/FeePolicy)', () => {
  let useCase: WithdrawUseCase;

  // Mocks do UoW e transação
  let uow: jest.Mocked<UnitOfWork>;
  let tx: any;
  let fees: jest.Mocked<FeePolicy>;

  // Estado interno da "conta fake"
  let accState: {
    balance: number;
    creditLimit: number;
    id: string;
    number: string;
  };

  // Conta fake compatível com a entidade de domínio usada no UC
  const makeFakeAccount = () => ({
    id: accState.id,
    number: accState.number,
    canDebit: (amt: Money, fee: Money) => {
      const total = toNumber(amt) + toNumber(fee);
      return accState.balance - total >= -accState.creditLimit;
    },
    applyDebit: (amt: Money, fee: Money) => {
      const total = toNumber(amt) + toNumber(fee);
      accState.balance = +(accState.balance - total).toFixed(2);
    },
    getBalance: () => Money.fromDecimal(accState.balance),
  });

  // Head fake com height atual = 5 -> próximo = 6
  const head = {
    accountId: 'acc-1',
    headHash: 'prev_hash',
    height: {
      inc: () => 6n, // próximo height
      toString: () => '5',
    },
  };

  beforeEach(async () => {
    accState = {
      balance: 1000.0,
      creditLimit: 500.0,
      id: 'acc-1',
      number: 'ACC001',
    };

    // Mocks dos ports dentro da transação
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

    // UoW mockado: withTransaction chama o callback com `tx`
    uow = {
      withTransaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    // FeePolicy mockado: 1.0 + 0,5% do valor
    fees = {
      calculate: jest.fn((amt) => {
        const a = toNumber(amt);
        const fee = 1.0 + a * 0.005;
        return Money.fromDecimal(+fee.toFixed(2));
      }),
    } as any;

    (tx.accounts.findByNumber as jest.Mock).mockImplementation(
      async (numVO: any) => {
        return numVO.value === accState.number ? makeFakeAccount() : null;
      },
    );

    (tx.ledger.getHeadForUpdate as jest.Mock).mockResolvedValue(head);
    (tx.ledger.append as jest.Mock).mockResolvedValue(undefined);
    (tx.ledger.advanceHead as jest.Mock).mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawUseCase,
        { provide: 'UnitOfWork', useValue: uow },
        { provide: 'FeePolicy', useValue: fees },
      ],
    }).compile();

    useCase = module.get<WithdrawUseCase>(WithdrawUseCase);
  });

  describe('exec', () => {
    it('executa withdraw com sucesso', async () => {
      const params = {
        accountNumber: 'ACC001',
        amount: 100,
        description: 'Test withdraw',
      };

      const result = await useCase.exec(params);

      expect(result).toBeDefined();
      // 1000 - 100 - 1.5
      expect(result.balance).toBe('898.50');
      expect(result.type).toBe(OperationType.WITHDRAW);
      expect(result.height).toBe('6'); // head.height.inc() -> "6"
      expect(result.hash).toBeDefined();

      expect(tx.accounts.save).toHaveBeenCalledTimes(1);
      expect(tx.ledger.append).toHaveBeenCalledTimes(1);
      expect(tx.ledger.advanceHead).toHaveBeenCalledTimes(1);
      // advanceHead(head, hash)
      const [, calledHash] = (tx.ledger.advanceHead as jest.Mock).mock.lastCall;
      expect(typeof calledHash).toBe('string');
    });

    it('lança erro quando amount <= 0', async () => {
      await expect(
        useCase.exec({ accountNumber: 'ACC001', amount: 0, description: 'x' }),
      ).rejects.toThrow(new BadRequestException('amount must be > 0'));
    });

    it('lança erro quando conta não encontrada', async () => {
      await expect(
        useCase.exec({
          accountNumber: 'NONEXISTENT',
          amount: 100,
          description: 'x',
        }),
      ).rejects.toThrow(new BadRequestException('account not found'));
    });

    it('lança erro quando saldo insuficiente considerando limite', async () => {
      // amount > balance + creditLimit
      await expect(
        useCase.exec({
          accountNumber: 'ACC001',
          amount: 2000,
          description: 'x',
        }),
      ).rejects.toThrow(
        new BadRequestException('insufficient funds considering credit limit'),
      );
    });

    it('permite saque usando limite de crédito', async () => {
      const res = await useCase.exec({
        accountNumber: 'ACC001',
        amount: 1200,
        description: 'x',
      });
      // 1000 - 1200 - 7.0 (fee: 1.0 + 1200*0.005) = -207.00
      expect(res.balance).toBe('-207.00');
      expect(res.height).toBe('6');
    });

    it('funciona sem description', async () => {
      const res = await useCase.exec({ accountNumber: 'ACC001', amount: 100 });
      expect(res.balance).toBe('898.50');
    });
  });

  describe('interações com FeePolicy e Ledger', () => {
    it('usa FeePolicy.calculate com OperationType.WITHDRAW', async () => {
      await useCase.exec({
        accountNumber: 'ACC001',
        amount: 100,
        description: 'x',
      });
      expect(fees.calculate).toHaveBeenCalledTimes(1);
      // Primeiro arg é Money, segundo é OperationType.WITHDRAW
      const [, opType] = (fees.calculate as jest.Mock).mock.lastCall;
      expect(opType).toBe(OperationType.WITHDRAW);
    });

    it('gera ledger entry e avança head corretamente', async () => {
      await useCase.exec({
        accountNumber: 'ACC001',
        amount: 250.75,
        description: 'Test withdraw',
      });

      // fee = 1 + 0.5% = 2.25375 -> 2.25
      const expectedFee = 2.25;
      const expectedBalance = 1000 - 250.75 - expectedFee; // 747.00

      expect(tx.accounts.save).toHaveBeenCalledWith(
        expect.objectContaining({
          // nossa conta fake salva uma entidade de domínio; validamos pelo efeito no estado
        }),
      );
      // confirma saldo final interno
      expect(accState.balance).toBe(747.0);

      expect(tx.ledger.append).toHaveBeenCalledTimes(1);
      expect(tx.ledger.advanceHead).toHaveBeenCalledTimes(1);
      const [passedHead, newHash] = (tx.ledger.advanceHead as jest.Mock).mock
        .lastCall;
      expect(passedHead).toBe(head);
      expect(typeof newHash).toBe('string');
    });
  });
});
