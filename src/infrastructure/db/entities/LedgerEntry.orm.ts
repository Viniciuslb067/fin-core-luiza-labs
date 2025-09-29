import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountOrm } from './Account.orm';
import { OperationType } from '../../../domain/enums/OperationType';

@Entity('ledger_entries')
export class LedgerEntryOrm {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => AccountOrm, { nullable: false })
  @JoinColumn({ name: 'account_id' })
  account!: AccountOrm;

  @Column({ type: 'varchar', length: 20 }) type!:
  | OperationType;

  @Column({ type: 'numeric', precision: 18, scale: 2 }) amount!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  fee!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Index()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at!: Date;

  @Column({ type: 'char', length: 64, nullable: true }) prev_hash!:
    | string
    | null;

  @Column({ type: 'char', length: 64, unique: true }) hash!: string;

  @Column({ type: 'bigint' }) height!: string;

  @Column({ type: 'uuid', nullable: true }) related_tx_id?: string;

  @CreateDateColumn() created_at!: Date;
}
