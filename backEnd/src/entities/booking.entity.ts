import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../common/enums/domain.enums';
import { Client } from './client.entity';
import { Destination } from './destination.entity';
import { Agent } from './agent.entity';
import { BookingStatusHistory } from './booking-status-history.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  client_id: string;

  @Column('uuid')
  destination_id: string;

  @Column({ type: 'uuid', nullable: true })
  agent_id: string;

  @Column({ type: 'date' })
  travel_date: string;

  @Column({ type: 'int', default: 1 })
  travelers: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  unit_price: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total_price: number;

  @Column({ type: 'uuid', nullable: true })
  applied_rule_id: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0.0 })
  penalty_fee: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0.0 })
  refund_amount: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'text', nullable: true })
  manager_comment: string;

  @Column({ type: 'text', nullable: true })
  client_notes: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idempotency_key: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', default: 0 })
  download_count: number;

  @ManyToOne(() => Client, (client) => client.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Destination, (dest) => dest.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'destination_id' })
  destination: Destination;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @OneToMany(() => BookingStatusHistory, (history) => history.booking, { cascade: true })
  statusHistory: BookingStatusHistory[];

  @OneToMany(() => WalletTransaction, (tx) => tx.booking)
  walletTransactions: WalletTransaction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
