import {
  Column,
  Entity,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountOrm } from './Account.orm';

@Entity('ledger_head')
export class LedgerHeadOrm {
  @PrimaryColumn('uuid') account_id!: string;

  @OneToOne(() => AccountOrm) account!: AccountOrm;

  @Column({ type: 'char', length: 64, nullable: true }) head_hash!:
    | string
    | null;
  @Column({ type: 'bigint', default: 0 }) height!: string;

  @UpdateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
