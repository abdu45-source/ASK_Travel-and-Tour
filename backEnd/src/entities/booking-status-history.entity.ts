import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { BookingStatus } from '../common/enums/domain.enums';

@Entity('booking_status_history')
export class BookingStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  booking_id: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    nullable: true,
  })
  from_status: BookingStatus;

  @Column({
    type: 'enum',
    enum: BookingStatus,
  })
  to_status: BookingStatus;

  @Column({ type: 'uuid', nullable: true })
  actor_id: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => Booking, (b) => b.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @CreateDateColumn()
  created_at: Date;
}
