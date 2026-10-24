import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../../entities/agent.entity';
import { User } from '../../entities/user.entity';
import { Client } from '../../entities/client.entity';
import { Booking } from '../../entities/booking.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, User, Client, Booking, AgentReferralCode])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
