import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Destination } from './destination.entity';
import { PriceAdjustType } from '../common/enums/domain.enums';

@Entity('price_rules')
export class PriceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  destination_id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({
    type: 'enum',
    enum: PriceAdjustType,
    default: PriceAdjustType.PERCENT,
  })
  adjust_type: PriceAdjustType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  value: number;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @ManyToOne(() => Destination, (dest) => dest.priceRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destination_id' })
  destination: Destination;

  @CreateDateColumn()
  created_at: Date;
}
