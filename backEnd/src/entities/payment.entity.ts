import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  booking_id: string;

  @Column({ type: 'varchar', length: 50, default: 'CASH' })
  method: string; // CASH, BANK_TRANSFER, TELEBIRR, CHAPA

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  provider_ref: string;

  @Column({ type: 'varchar', length: 50, default: 'COMPLETED' })
  status: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @CreateDateColumn()
  created_at: Date;
}
