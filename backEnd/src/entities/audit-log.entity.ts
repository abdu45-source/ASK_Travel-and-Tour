import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actor_id: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  before_state: any;

  @Column({ type: 'jsonb', nullable: true })
  after_state: any;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
