import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Client } from './client.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  user_id: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  referral_code: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0.0 })
  wallet_balance: number;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string;

  @Column({ type: 'text', nullable: true })
  payout_details: string;

  @Column({ type: 'timestamp', nullable: true })
  deactivated_at: Date;

  @OneToOne(() => User, (user) => user.agentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @OneToMany(() => Client, (client) => client.referredByAgent)
  clients: Client[];

  @OneToMany(() => WalletTransaction, (tx) => tx.agent)
  walletTransactions: WalletTransaction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
