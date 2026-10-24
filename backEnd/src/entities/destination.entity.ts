import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { DestinationStatus } from '../common/enums/domain.enums';
import { PriceRule } from './price-rule.entity';
import { Booking } from './booking.entity';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  region: string; // e.g. Amhara, Tigray, Oromia, Afar, SNNPR, Harari

  @Column({ type: 'text' })
  short_description: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  itinerary: { day: number; title: string; activities: string }[];

  @Column({ type: 'jsonb', default: [] })
  inclusions: string[];

  @Column({ type: 'jsonb', default: [] })
  exclusions: string[];

  @Column({ type: 'int', default: 1 })
  duration_days: number;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  base_price: number;

  @Column({
    type: 'enum',
    enum: DestinationStatus,
    default: DestinationStatus.ACTIVE,
  })
  status: DestinationStatus;

  @Column({ type: 'jsonb', default: [] })
  gallery_images: string[];

  @Column({ type: 'int', default: 0 })
  popularity_score: number;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @OneToMany(() => PriceRule, (rule) => rule.destination, { cascade: true })
  priceRules: PriceRule[];

  @OneToMany(() => Booking, (booking) => booking.destination)
  bookings: Booking[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
