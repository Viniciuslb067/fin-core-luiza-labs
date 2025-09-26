import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Transactions (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/transactions/deposit (POST)', () => {
    it('should create a deposit transaction', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .send({
          accountNumber: 'ACC001',
          amount: 100,
          description: 'Test deposit',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('entryId');
          expect(res.body).toHaveProperty('hash');
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .send({
          accountNumber: 'ACC001',
          // missing amount
        })
        .expect(400);
    });

    it('should validate amount is positive', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .send({
          accountNumber: 'ACC001',
          amount: -100,
          description: 'Invalid amount',
        })
        .expect(400);
    });
  });

  describe('/transactions/withdraw (POST)', () => {
    it('should create a withdraw transaction', () => {
      return request(app.getHttpServer())
        .post('/transactions/withdraw')
        .send({
          accountNumber: 'ACC001',
          amount: 50,
          description: 'Test withdraw',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('balance');
          expect(res.body).toHaveProperty('entryId');
          expect(res.body).toHaveProperty('hash');
        });
    });

    it('should handle insufficient funds', () => {
      return request(app.getHttpServer())
        .post('/transactions/withdraw')
        .send({
          accountNumber: 'ACC001',
          amount: 10000, // Very large amount
          description: 'Should fail',
        })
        .expect(400);
    });
  });

  describe('/transactions/transfer (POST)', () => {
    it('should create a transfer transaction', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .send({
          from: 'ACC001',
          to: 'ACC002',
          amount: 100,
          description: 'Test transfer',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('outTxId');
          expect(res.body).toHaveProperty('inTxId');
          expect(res.body).toHaveProperty('originAfter');
          expect(res.body).toHaveProperty('destAfter');
        });
    });

    it('should prevent transfer to same account', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .send({
          from: 'ACC001',
          to: 'ACC001',
          amount: 100,
          description: 'Should fail',
        })
        .expect(400);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/transactions/transfer')
        .send({
          from: 'ACC001',
          // missing to and amount
        })
        .expect(400);
    });
  });

  describe('/transactions/batch (POST)', () => {
    it('should process batch transactions', () => {
      return request(app.getHttpServer())
        .post('/transactions/batch')
        .send({
          items: [
            {
              type: 'DEPOSIT',
              accountNumber: 'ACC001',
              amount: 100,
              description: 'Batch deposit 1',
            },
            {
              type: 'WITHDRAW',
              accountNumber: 'ACC002',
              amount: 50,
              description: 'Batch withdraw 1',
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('processed');
          expect(res.body).toHaveProperty('failed');
        });
    });

    it('should validate batch items', () => {
      return request(app.getHttpServer())
        .post('/transactions/batch')
        .send({
          items: [
            {
              type: 'INVALID_TYPE',
              accountNumber: 'ACC001',
              amount: 100,
            },
          ],
        })
        .expect(400);
    });
  });

  describe('/transactions/verify/:accountNumber (GET)', () => {
    it('should verify chain for existing account', () => {
      return request(app.getHttpServer())
        .get('/transactions/verify/ACC001')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok');
          if (res.body.ok) {
            expect(res.body).toHaveProperty('height');
            expect(res.body).toHaveProperty('head');
          }
        });
    });

    it('should handle non-existent account', () => {
      return request(app.getHttpServer())
        .get('/transactions/verify/NONEXISTENT')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', false);
          expect(res.body).toHaveProperty('error');
        });
    });
  });

  describe('Idempotency', () => {
    it('should handle idempotency key header', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .set('idempotency-key', 'test-key-123')
        .send({
          accountNumber: 'ACC001',
          amount: 100,
          description: 'Idempotent deposit',
        })
        .expect(200);
    });
  });

  describe('Error handling', () => {
    it('should return proper error format', () => {
      return request(app.getHttpServer())
        .post('/transactions/deposit')
        .send({
          accountNumber: 'NONEXISTENT',
          amount: 100,
          description: 'Should fail',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('message');
        });
    });
  });
});
