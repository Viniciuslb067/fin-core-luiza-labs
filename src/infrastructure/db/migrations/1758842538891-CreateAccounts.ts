import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccounts1758842538891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
        number VARCHAR(50) NOT NULL UNIQUE,
        balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        credit_limit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET = utf8mb4
      COLLATE = utf8mb4_0900_ai_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS accounts;`);
  }
}
