import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { RefreshSession } from '../../entities/refresh-session.entity';
import { Agent } from '../../entities/agent.entity';
import { Client } from '../../entities/client.entity';
import { Notification } from '../../entities/notification.entity';
import { PendingRegistration } from '../../entities/pending-registration.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RefreshSession,
      Agent,
      Client,
      Notification,
      PendingRegistration,
      AgentReferralCode,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'ask_digital_jwt_secret_key_2026'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
