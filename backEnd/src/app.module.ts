import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DestinationsModule } from './modules/destinations/destinations.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MailModule } from './modules/mail/mail.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // 120 req/min baseline protection (SRS 7.3)
      },
    ]),
    DatabaseModule,
    AuditModule,
    RbacModule,
    MailModule,
    AuthModule,
    UsersModule,
    DestinationsModule,
    PricingModule,
    AgentsModule,
    ClientsModule,
    BookingsModule,
    WalletModule,
    NotificationsModule,
    ChatModule,
    DashboardsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
