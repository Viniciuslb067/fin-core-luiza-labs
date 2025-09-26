import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLedgerEntries1758842542605 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
        account_id CHAR(36) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        fee DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        description VARCHAR(255) NULL,
        occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        prev_hash CHAR(64) NULL,
        hash CHAR(64) NOT NULL UNIQUE,
        height BIGINT NOT NULL,
        related_tx_id CHAR(36) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_ledger_entries_account
          FOREIGN KEY (account_id) REFERENCES accounts(id)
          ON DELETE CASCADE
          ON UPDATE RESTRICT
      )
      ENGINE=InnoDB
      DEFAULT CHARSET = utf8mb4
      COLLATE = utf8mb4_0900_ai_ci;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX ux_ledger_acc_height
        ON ledger_entries (account_id, height);
    `);

    await queryRunner.query(`
      CREATE INDEX ix_ledger_acc_hash
        ON ledger_entries (account_id, hash);
    `);

    await queryRunner.query(`
      CREATE INDEX ix_ledger_acc_prev
        ON ledger_entries (account_id, prev_hash);
    `);

    await queryRunner.query(`
      CREATE INDEX ix_ledger_occ
        ON ledger_entries (occurred_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX ux_ledger_acc_height ON ledger_entries;`,
    );
    await queryRunner.query(`DROP INDEX ix_ledger_acc_hash ON ledger_entries;`);
    await queryRunner.query(`DROP INDEX ix_ledger_acc_prev ON ledger_entries;`);
    await queryRunner.query(`DROP INDEX ix_ledger_occ ON ledger_entries;`);

    await queryRunner.query(`DROP TABLE IF EXISTS ledger_entries;`);
  }
}
