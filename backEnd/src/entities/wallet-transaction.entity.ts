import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Agent } from './agent.entity';
import { Booking } from './booking.entity';
import { WalletTxType } from '../common/enums/domain.enums';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agent_id: string;

  @Column({ type: 'uuid', nullable: true })
  booking_id: string;

  @Column({
    type: 'enum',
    enum: WalletTxType,
  })
  type: WalletTxType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 6, scale: 4, default: 0.10 })
  rate_used: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  balance_after: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @ManyToOne(() => Agent, (agent) => agent.walletTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @ManyToOne(() => Booking, (booking) => booking.walletTransactions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @CreateDateColumn()
  created_at: Date;
}
