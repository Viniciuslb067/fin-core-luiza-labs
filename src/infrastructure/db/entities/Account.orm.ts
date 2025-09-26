import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('accounts')
export class AccountOrm {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ unique: true }) number!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  balance!: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  credit_limit!: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
