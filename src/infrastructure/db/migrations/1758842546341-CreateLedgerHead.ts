import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLedgerHead1758842546341 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ledger_head (
        account_id CHAR(36) NOT NULL PRIMARY KEY,
        head_hash CHAR(64) NULL,
        height BIGINT NOT NULL DEFAULT 0,
        updated_at DATETIME(6) NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_ledger_head_account
          FOREIGN KEY (account_id) REFERENCES accounts(id)
          ON DELETE CASCADE
          ON UPDATE RESTRICT
      )
      ENGINE=InnoDB
      DEFAULT CHARSET = utf8mb4
      COLLATE = utf8mb4_0900_ai_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_head;`);
  }
}
