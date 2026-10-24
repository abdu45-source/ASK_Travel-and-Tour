import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('pending_registrations')
export class PendingRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 20, default: 'CLIENT' })
  role: string; // 'CLIENT' | 'AGENT'

  @Column({ type: 'varchar', length: 30 })
  referral_code: string; // The generated referral code sent to user email

  @Column({ type: 'uuid', nullable: true })
  referred_by_agent_id: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  referred_by_code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payout_details: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

