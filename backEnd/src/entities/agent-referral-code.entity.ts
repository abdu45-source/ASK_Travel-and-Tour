import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity('agent_referral_codes')
export class AgentReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agent_id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  code: string; // Dynamic one-time code, e.g. AGT-98X2KM

  @Column({ type: 'varchar', length: 150, nullable: true })
  client_email: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  client_name: string;

  @Column({ type: 'text', nullable: true })
  personal_note: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED';

  @Column({ type: 'uuid', nullable: true })
  claimed_by_user_id: string;

  @Column({ type: 'timestamp', nullable: true })
  claimed_at: Date;

  @Column({ type: 'int', default: 1 })
  sent_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_sent_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

