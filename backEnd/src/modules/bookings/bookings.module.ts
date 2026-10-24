import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../entities/booking.entity';
import { BookingStatusHistory } from '../../entities/booking-status-history.entity';
import { Destination } from '../../entities/destination.entity';
import { Agent } from '../../entities/agent.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { Client } from '../../entities/client.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingStatusHistory,
      Destination,
      Agent,
      AgentReferralCode,
      Client,
      WalletTransaction,
      Notification,
      User,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
