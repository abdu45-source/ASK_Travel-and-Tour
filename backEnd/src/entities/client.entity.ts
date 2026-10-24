import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Agent } from './agent.entity';
import { Booking } from './booking.entity';

@Entity('clients')
export class Client {
  @PrimaryColumn('uuid')
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  referred_by_agent_id: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  referral_code_used: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  client_referral_code: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  onboarding_status: string;

  @OneToOne(() => User, (user) => user.clientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Agent, (agent) => agent.clients, { nullable: true })
  @JoinColumn({ name: 'referred_by_agent_id' })
  referredByAgent: Agent;

  @OneToMany(() => Booking, (booking) => booking.client)
  bookings: Booking[];

  @CreateDateColumn()
  created_at: Date;
}
