// src/wallet/entities/wallet-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  user_id: string;

  @Column({ type: 'bigint' })
  amount_cents: number;

  @Column({ type: 'text' })
  type: 'debit' | 'credit' | 'reserve' | 'release' | 'fee';

  @Column({ type: 'text', nullable: true })
  reference?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
