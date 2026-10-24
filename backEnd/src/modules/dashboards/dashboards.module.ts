import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../entities/booking.entity';
import { Destination } from '../../entities/destination.entity';
import { Agent } from '../../entities/agent.entity';
import { Client } from '../../entities/client.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { DashboardsService } from './dashboards.service';
import { DashboardsController } from './dashboards.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Destination,
      Agent,
      Client,
      WalletTransaction,
      User,
      Notification,
    ]),
  ],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
