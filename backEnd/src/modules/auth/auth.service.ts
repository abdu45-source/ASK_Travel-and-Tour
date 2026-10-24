import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { RefreshSession } from '../../entities/refresh-session.entity';
import { Agent } from '../../entities/agent.entity';
import { Client } from '../../entities/client.entity';
import { Notification } from '../../entities/notification.entity';
import { PendingRegistration } from '../../entities/pending-registration.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { UserStatus } from '../../common/enums/domain.enums';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshSession)
    private refreshRepo: Repository<RefreshSession>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    @InjectRepository(PendingRegistration)
    private pendingRepo: Repository<PendingRegistration>,
    @InjectRepository(AgentReferralCode)
    private dynamicCodeRepo: Repository<AgentReferralCode>,
    private jwtService: JwtService,
    private rbacService: RbacService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  async login(email: string, pass: string, ip?: string, userAgent?: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.REVOKED) {
      throw new UnauthorizedException('Account has been suspended or revoked');
    }

    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      await this.auditService.log({
        actorId: user.id,
        action: 'LOGIN_FAILURE',
        entityType: 'User',
        entityId: user.id,
        ip,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    user.last_login_at = new Date();
    await this.userRepo.save(user);

    // Generate tokens
    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = await this.generateTokenPair(user, familyId, ip, userAgent);

    await this.auditService.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ip,
      userAgent,
    });

    const userProfile = await this.getMe(user.id);

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }

  async registerClient(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    referral_code?: string;
  }) {
    const existing = await this.userRepo.findOne({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    // Check referral code if provided
    let referringAgent: Agent | null = null;
    if (data.referral_code) {
      referringAgent = await this.agentRepo.findOne({
        where: { referral_code: data.referral_code.toUpperCase().trim() },
      });
      if (!referringAgent || referringAgent.deactivated_at) {
        throw new BadRequestException('Referral code is invalid or no longer active.');
      }
    }

    const password_hash = await bcrypt.hash(data.password, 12);
    const user = this.userRepo.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    });
    const savedUser = await this.userRepo.save(user);

    // Create client profile
    const client = this.clientRepo.create({
      user_id: savedUser.id,
      referred_by_agent_id: referringAgent ? referringAgent.id : null,
      referral_code_used: data.referral_code ? data.referral_code.toUpperCase().trim() : null,
      onboarding_status: 'ACTIVE',
    });
    await this.clientRepo.save(client);

    // Assign CLIENT role
    await this.rbacService.assignRoleToUser(savedUser.id, 'CLIENT');

    // Notify Managers of new client registration (FR-ALR-01)
    const managerUsers = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.userRoles', 'ur')
      .innerJoin('ur.role', 'r')
      .where('r.role_name IN (:...roles)', { roles: ['MANAGER', 'OWNER'] })
      .getMany();

    for (const mgr of managerUsers) {
      await this.notifRepo.save(
        this.notifRepo.create({
          user_id: mgr.id,
          type: 'CLIENT_REGISTERED',
          title: 'New Client Registered',
          body: `Client ${savedUser.name} registered ${
            referringAgent
              ? `using referral code ${referringAgent.referral_code}`
              : 'directly'
          }`,
          ref_type: 'Client',
          ref_id: savedUser.id,
        }),
      );
    }

    await this.auditService.log({
      actorId: savedUser.id,
      action: 'CLIENT_REGISTERED',
      entityType: 'User',
      entityId: savedUser.id,
      after: { name: savedUser.name, email: savedUser.email, referralCode: data.referral_code },
    });

    // Mailtrap Notification: Welcome Email to Client, Executive Alert to Owner, and Manager Alerts
    this.mailService
      .sendClientWelcomeEmail(savedUser.email, savedUser.name)
      .catch(() => {});

    this.mailService
      .sendOwnerExecutiveAlert(
        'New Client Registration',
        'New Traveler Registered at ASK Ethiopia Tours',
        {
          traveler_name: savedUser.name,
          email: savedUser.email,
          phone: savedUser.phone || 'Not provided',
          onboarding_channel: referringAgent
            ? `Referral Code: ${referringAgent.referral_code}`
            : 'Direct Organic Signup',
          registered_at: new Date().toISOString(),
        },
        'http://localhost:5173/dashboard/owner',
      )
      .catch(() => {});

    for (const mgr of managerUsers) {
      if (mgr.email && mgr.email !== this.mailService.getOwnerEmail()) {
        this.mailService
          .sendManagerNotification(
            mgr.email,
            mgr.name,
            'Client Registration',
            `New Traveler Registered: ${savedUser.name}`,
            {
              traveler_name: savedUser.name,
              email: savedUser.email,
              phone: savedUser.phone || 'N/A',
              referral_source: referringAgent
                ? `Agent Partner (${referringAgent.referral_code})`
                : 'Direct Client Signup',
              registered_at: new Date().toISOString(),
            },
            'http://localhost:5173/dashboard/manager',
          )
          .catch(() => {});
      }
    }

    if (referringAgent) {
      const agentUser = await this.userRepo.findOne({ where: { id: referringAgent.user_id } });
      if (agentUser && agentUser.email) {
        this.mailService
          .sendMail({
            to: agentUser.email,
            subject: `New Traveler Connected — Referral Code: ${referringAgent.referral_code}`,
            html: `<div style="font-family:sans-serif;padding:24px;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;max-width:540px;">
              <h2 style="color:#0f172a;margin-top:0;">New Client Registered, ${agentUser.name}!</h2>
              <p style="color:#44403c;">A new traveler, <strong>${savedUser.name}</strong> (${savedUser.email}), just created an account using your exclusive referral code: <code style="font-weight:bold;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;">${referringAgent.referral_code}</code>.</p>
              <p style="color:#44403c;">When they complete an expedition reservation, your 10% partner commission will be credited directly to your partner wallet upon approval.</p>
              <div style="margin-top:20px;"><a href="http://localhost:5173/dashboard/agent" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;">View Agent Wallet</a></div>
            </div>`,
          })
          .catch(() => {});
      }
    }

    return this.login(data.email, data.password);
  }

  generateReferralCode(prefix = '', length = 6): string {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return prefix ? `${prefix}-${code}` : code;
  }

  async initiateRegistration(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'CLIENT' | 'AGENT';
    referral_code?: string;
    payout_details?: string;
  }) {
    const emailNorm = data.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({
      where: { email: emailNorm },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists. Please sign in instead.');
    }

    const role = data.role === 'AGENT' ? 'AGENT' : 'CLIENT';

    // If client provided a referring agent code, validate it
    let referringAgent: Agent | null = null;
    let normalizedReferredCode: string | null = null;

    if (data.referral_code) {
      const codeNorm = data.referral_code.toUpperCase().replace(/\s+/g, '').trim();

      // Check dynamic one-time referral codes first
      const dynamicCode = await this.dynamicCodeRepo.findOne({
        where: { code: codeNorm },
        relations: ['agent', 'agent.user'],
      });

      if (dynamicCode) {
        if (dynamicCode.status === 'CLAIMED') {
          throw new BadRequestException(
            'This one-time dynamic referral code has already been claimed/used by a registered traveler. Please request a fresh one from your travel agent.',
          );
        }
        if (dynamicCode.expires_at && new Date() > dynamicCode.expires_at) {
          throw new BadRequestException(
            'This one-time dynamic referral code has expired. Please request a fresh code from your travel agent.',
          );
        }
        if (dynamicCode.agent.deactivated_at) {
          throw new BadRequestException('The referring travel agent is currently inactive.');
        }
        referringAgent = dynamicCode.agent;
        normalizedReferredCode = dynamicCode.code;
      } else {
        // Fall back to agent primary profile referral code
        referringAgent = await this.agentRepo.findOne({
          where: { referral_code: codeNorm },
        });
        if (!referringAgent || referringAgent.deactivated_at) {
          throw new BadRequestException('The referring agent referral code is invalid or deactivated.');
        }
        normalizedReferredCode = referringAgent.referral_code;
      }
    }

    // Generate unique referral code for this registrant
    let generatedReferralCode = '';
    if (role === 'AGENT') {
      let isUnique = false;
      while (!isUnique) {
        generatedReferralCode = this.generateReferralCode('', 8);
        const col = await this.agentRepo.findOne({ where: { referral_code: generatedReferralCode } });
        if (!col) isUnique = true;
      }
    } else {
      generatedReferralCode = this.generateReferralCode('ASK', 6);
    }

    const password_hash = await bcrypt.hash(data.password, 12);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins validity

    // Upsert into pending_registrations
    let pending = await this.pendingRepo.findOne({ where: { email: emailNorm } });
    if (!pending) {
      pending = this.pendingRepo.create({
        email: emailNorm,
        name: data.name.trim(),
        phone: data.phone,
        password_hash,
        role,
        referral_code: generatedReferralCode,
        referred_by_agent_id: referringAgent ? referringAgent.id : null,
        referred_by_code: normalizedReferredCode,
        payout_details: data.payout_details || (role === 'AGENT' ? 'Commercial Bank of Ethiopia (CBE)' : null),
        attempts: 0,
        expires_at: expiresAt,
      });
    } else {
      pending.name = data.name.trim();
      pending.phone = data.phone;
      pending.password_hash = password_hash;
      pending.role = role;
      pending.referral_code = generatedReferralCode;
      pending.referred_by_agent_id = referringAgent ? referringAgent.id : null;
      pending.referred_by_code = normalizedReferredCode;
      pending.payout_details = data.payout_details || (role === 'AGENT' ? 'Commercial Bank of Ethiopia (CBE)' : null);
      pending.attempts = 0;
      pending.expires_at = expiresAt;
    }
    await this.pendingRepo.save(pending);

    // Send the generated referral code to user email via Brevo / SMTP
    const dispatchRes = await this.mailService.sendReferralVerificationEmail(
      emailNorm,
      pending.name,
      generatedReferralCode,
      role,
    );

    const isRealSent = dispatchRes.provider === 'brevo' || dispatchRes.provider === 'smtp';

    return {
      success: true,
      message: isRealSent
        ? `Real email with your referral code was dispatched to ${emailNorm}! Please check your inbox.`
        : `Referral code generated. Note: Real email delivery requires 1-click IP authorization in Brevo.`,
      email: emailNorm,
      role,
      simulationCode: generatedReferralCode,
      isRealSent,
      ipBlocked: dispatchRes.ipBlocked || false,
      blockedIp: dispatchRes.blockedIp,
      authUrl: dispatchRes.authUrl,
    };
  }

  async confirmRegistration(
    data: { email: string; code: string },
    ip?: string,
    userAgent?: string,
  ) {
    const emailNorm = data.email.toLowerCase().trim();
    const codeNorm = data.code.toUpperCase().replace(/\s+/g, '').trim();

    const pending = await this.pendingRepo.findOne({ where: { email: emailNorm } });
    if (!pending) {
      throw new BadRequestException('No pending registration found for this email. Please submit your details first.');
    }

    if (new Date() > pending.expires_at) {
      throw new BadRequestException('The referral code has expired. Please click "Resend Code" to receive a fresh code.');
    }

    const expectedCode = pending.referral_code.toUpperCase().replace(/\s+/g, '').trim();
    const codeWithoutPrefix = expectedCode.replace(/^ASK-|^AGT-|^REF-/, '');
    const userWithoutPrefix = codeNorm.replace(/^ASK-|^AGT-|^REF-/, '');

    const isMatch = codeNorm === expectedCode || userWithoutPrefix === codeWithoutPrefix;

    if (!isMatch) {
      pending.attempts = (pending.attempts || 0) + 1;
      await this.pendingRepo.save(pending);
      if (pending.attempts >= 5) {
        await this.pendingRepo.delete({ id: pending.id });
        throw new BadRequestException('Too many incorrect code attempts. Please start registration again.');
      }
      throw new BadRequestException(
        `Invalid referral code. Please check the code sent to ${emailNorm}. (${5 - pending.attempts} attempts remaining)`,
      );
    }

    // Code verified! Check again for duplicate user email
    const existing = await this.userRepo.findOne({ where: { email: emailNorm } });
    if (existing) {
      await this.pendingRepo.delete({ id: pending.id });
      throw new ConflictException('An account with this email was already registered.');
    }

    const user = this.userRepo.create({
      name: pending.name,
      email: emailNorm,
      phone: pending.phone,
      password_hash: pending.password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    });
    const savedUser = await this.userRepo.save(user);

    if (pending.role === 'AGENT') {
      // Create Agent profile
      const agent = this.agentRepo.create({
        user_id: savedUser.id,
        referral_code: pending.referral_code,
        wallet_balance: 0.0,
        payout_details: pending.payout_details || 'Commercial Bank of Ethiopia (CBE)',
      });
      await this.agentRepo.save(agent);
      await this.rbacService.assignRoleToUser(savedUser.id, 'AGENT');

      this.mailService
        .sendAgentReferralCodeEmail(savedUser.email, savedUser.name, pending.referral_code)
        .catch(() => {});

      this.mailService
        .sendOwnerExecutiveAlert(
          'New Agent Partner Onboarded',
          'Agent Registered via Referral Verification',
          {
            agent_name: savedUser.name,
            email: savedUser.email,
            referral_code: pending.referral_code,
            registered_at: new Date().toISOString(),
          },
          'http://localhost:5173/dashboard/owner',
        )
        .catch(() => {});
    } else {
      // Create Client profile
      const client = this.clientRepo.create({
        user_id: savedUser.id,
        referred_by_agent_id: pending.referred_by_agent_id,
        referral_code_used: pending.referred_by_code,
        client_referral_code: pending.referral_code,
        onboarding_status: 'ACTIVE',
      });
      await this.clientRepo.save(client);
      await this.rbacService.assignRoleToUser(savedUser.id, 'CLIENT');

      // If registered with a dynamic one-time referral code, mark it CLAIMED
      if (pending.referred_by_code) {
        const dynCode = await this.dynamicCodeRepo.findOne({
          where: { code: pending.referred_by_code },
        });
        if (dynCode && dynCode.status === 'ACTIVE') {
          dynCode.status = 'CLAIMED';
          dynCode.claimed_by_user_id = savedUser.id;
          dynCode.claimed_at = new Date();
          await this.dynamicCodeRepo.save(dynCode);
        }
      }

      this.mailService
        .sendClientWelcomeEmail(savedUser.email, savedUser.name)
        .catch(() => {});

      this.mailService
        .sendOwnerExecutiveAlert(
          'New Client Registration',
          'New Traveler Registered at ASK Ethiopia Tours',
          {
            traveler_name: savedUser.name,
            email: savedUser.email,
            client_referral_code: pending.referral_code,
            referred_by: pending.referred_by_code || 'Organic Signup',
            registered_at: new Date().toISOString(),
          },
          'http://localhost:5173/dashboard/owner',
        )
        .catch(() => {});
    }

    // Clean up pending record
    await this.pendingRepo.delete({ id: pending.id });

    // Notify Managers
    const managerUsers = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.userRoles', 'ur')
      .innerJoin('ur.role', 'r')
      .where('r.role_name IN (:...roles)', { roles: ['MANAGER', 'OWNER'] })
      .getMany();

    for (const mgr of managerUsers) {
      await this.notifRepo.save(
        this.notifRepo.create({
          user_id: mgr.id,
          type: pending.role === 'AGENT' ? 'PARTNER_JOINED' : 'CLIENT_REGISTERED',
          title: pending.role === 'AGENT' ? 'New Agent Partner Joined' : 'New Client Registered',
          body: `${savedUser.name} registered as ${pending.role} (${pending.referral_code})`,
          ref_type: pending.role === 'AGENT' ? 'Agent' : 'Client',
          ref_id: savedUser.id,
        }),
      );
    }

    await this.auditService.log({
      actorId: savedUser.id,
      action: pending.role === 'AGENT' ? 'AGENT_REGISTERED' : 'CLIENT_REGISTERED',
      entityType: 'User',
      entityId: savedUser.id,
      after: { name: savedUser.name, email: savedUser.email, referralCode: pending.referral_code },
    });

    const familyId = crypto.randomUUID();
    const { accessToken, refreshToken } = await this.generateTokenPair(savedUser, familyId, ip, userAgent);
    const userProfile = await this.getMe(savedUser.id);

    return {
      accessToken,
      refreshToken,
      user: userProfile,
    };
  }

  async resendReferralCode(email: string) {
    const emailNorm = email.toLowerCase().trim();
    const pending = await this.pendingRepo.findOne({ where: { email: emailNorm } });
    if (!pending) {
      throw new BadRequestException('No pending registration found for this email.');
    }

    // Refresh referral code & expiration
    if (pending.role === 'AGENT') {
      pending.referral_code = this.generateReferralCode('', 8);
    } else {
      pending.referral_code = this.generateReferralCode('ASK', 6);
    }
    pending.expires_at = new Date(Date.now() + 30 * 60 * 1000);
    pending.attempts = 0;
    await this.pendingRepo.save(pending);

    const dispatchRes = await this.mailService.sendReferralVerificationEmail(
      emailNorm,
      pending.name,
      pending.referral_code,
      pending.role,
    );
    const isRealSent = dispatchRes.provider === 'brevo' || dispatchRes.provider === 'smtp';

    return {
      success: true,
      message: isRealSent
        ? `A fresh real email was sent to ${emailNorm}.`
        : `A fresh referral code was generated.`,
      simulationCode: pending.referral_code,
      isRealSent,
      ipBlocked: dispatchRes.ipBlocked || false,
      blockedIp: dispatchRes.blockedIp,
      authUrl: dispatchRes.authUrl,
    };
  }

  async refreshToken(rawRefreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const session = await this.refreshRepo.findOne({
      where: { token_hash: tokenHash },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: If token already replaced or revoked, revoke family!
    if (session.revoked_at || session.replaced_by) {
      await this.refreshRepo
        .createQueryBuilder()
        .update(RefreshSession)
        .set({ revoked_at: new Date() })
        .where('family_id = :familyId', { familyId: session.family_id })
        .execute();

      await this.auditService.log({
        actorId: session.user_id,
        action: 'TOKEN_REUSE_DETECTED',
        entityType: 'RefreshSession',
        entityId: session.id,
        ip,
        userAgent,
      });

      throw new UnauthorizedException('Token reuse detected. All sessions revoked.');
    }

    if (new Date() > session.expires_at) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Generate new pair within same family
    const { accessToken, refreshToken: newRefreshToken, session: newSession } =
      await this.generateTokenPair(session.user, session.family_id, ip, userAgent);

    // Mark previous session replaced
    session.replaced_by = newSession.id;
    session.revoked_at = new Date();
    await this.refreshRepo.save(session);

    const userProfile = await this.getMe(session.user_id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: userProfile,
    };
  }

  async logout(rawRefreshToken: string) {
    if (!rawRefreshToken) return { success: true };
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.refreshRepo.update({ token_hash: tokenHash }, { revoked_at: new Date() });
    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.refreshRepo.update({ user_id: userId }, { revoked_at: new Date() });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['agentProfile', 'clientProfile', 'clientProfile.referredByAgent'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { roles, permissions } = await this.rbacService.getUserEffectivePermissions(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles,
      permissions,
      agentProfile: user.agentProfile,
      clientProfile: user.clientProfile,
    };
  }

  private async generateTokenPair(
    user: User,
    familyId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days

    const session = this.refreshRepo.create({
      user_id: user.id,
      token_hash: tokenHash,
      family_id: familyId,
      device: userAgent,
      ip,
      expires_at: expiresAt,
    });
    const savedSession = await this.refreshRepo.save(session);

    return { accessToken, refreshToken: rawRefreshToken, session: savedSession };
  }
}
