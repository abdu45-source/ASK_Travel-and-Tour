import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationType } from '../common/enums/domain.enums';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.CLIENT_SUPPORT,
  })
  type: ConversationType;

  @Column({ type: 'jsonb', default: [] })
  participant_ids: string[]; // List of user IDs participating in the conversation

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  @OneToMany(() => Message, (msg) => msg.conversation, { cascade: true })
  messages: Message[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
