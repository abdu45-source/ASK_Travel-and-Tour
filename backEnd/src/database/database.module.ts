import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RefreshSession } from '../entities/refresh-session.entity';
import { Agent } from '../entities/agent.entity';
import { Client } from '../entities/client.entity';
import { Destination } from '../entities/destination.entity';
import { PriceRule } from '../entities/price-rule.entity';
import { Booking } from '../entities/booking.entity';
import { BookingStatusHistory } from '../entities/booking-status-history.entity';
import { WalletTransaction } from '../entities/wallet-transaction.entity';
import { Payment } from '../entities/payment.entity';
import { Notification } from '../entities/notification.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { AppSetting } from '../entities/app-setting.entity';
import { PendingRegistration } from '../entities/pending-registration.entity';
import { AgentReferralCode } from '../entities/agent-referral-code.entity';

const isProductionCloud =
  process.env.DB_SSL === 'true' ||
  (process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('localhost') &&
    !process.env.DATABASE_URL.includes('127.0.0.1') &&
    (process.env.DATABASE_URL.includes('render.com') ||
      process.env.DATABASE_URL.includes('sslmode=require') ||
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.DATABASE_URL.includes('neon') ||
      process.env.NODE_ENV === 'production'));

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : {
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'abduselam',
            database: process.env.DB_NAME || 'travel_tour_db',
          }),
      ssl: isProductionCloud ? { rejectUnauthorized: false } : false,
      entities: [
        User,
        Role,
        RolePermission,
        UserRole,
        RefreshSession,
        Agent,
        Client,
        Destination,
        PriceRule,
        Booking,
        BookingStatusHistory,
        WalletTransaction,
        Payment,
        Notification,
        Conversation,
        Message,
        AuditLog,
        AppSetting,
        PendingRegistration,
        AgentReferralCode,
      ],
      synchronize: true, // Auto schema sync
      logging: false,
      retryAttempts: 10,
      retryDelay: 3000,
    }),
  ],
})
export class DatabaseModule {}
