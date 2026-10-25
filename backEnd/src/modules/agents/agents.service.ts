import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Agent } from '../../entities/agent.entity';
import { User } from '../../entities/user.entity';
import { Client } from '../../entities/client.entity';
import { Booking } from '../../entities/booking.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { PendingRegistration } from '../../entities/pending-registration.entity';
import { UserStatus, BookingStatus } from '../../common/enums/domain.enums';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(AgentReferralCode)
    private dynamicCodeRepo: Repository<AgentReferralCode>,
    @InjectRepository(PendingRegistration)
    private pendingRepo: Repository<PendingRegistration>,
    private rbacService: RbacService,
    private auditService: AuditService,
    private mailService: MailService,
  ) {}

  // Generate unambiguous uppercase referral code (excludes 0, O, 1, I, L)
  generateReferralCode(length = 8): string {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async registerAgent(
    data: {
      name: string;
      email: string;
      phone?: string;
      payout_details?: string;
      password?: string;
    },
    managerId?: string,
  ): Promise<Agent> {
    const existing = await this.userRepo.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const initialPassword = data.password || 'Agent@2026!';
    const password_hash = await bcrypt.hash(initialPassword, 12);

    const user = this.userRepo.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    });
    const savedUser = await this.userRepo.save(user);

    // Assign AGENT role
    await this.rbacService.assignRoleToUser(savedUser.id, 'AGENT', managerId);

    // Ensure unique referral code
    let referralCode = this.generateReferralCode();
    let collision = await this.agentRepo.findOne({ where: { referral_code: referralCode } });
    while (collision) {
      referralCode = this.generateReferralCode();
      collision = await this.agentRepo.findOne({ where: { referral_code: referralCode } });
    }

    const agent = this.agentRepo.create({
      user_id: savedUser.id,
      referral_code: referralCode,
      wallet_balance: 0.0,
      manager_id: managerId,
      payout_details: data.payout_details,
    });
    const savedAgent = await this.agentRepo.save(agent);

    await this.auditService.log({
      actorId: managerId,
      action: 'AGENT_REGISTERED',
      entityType: 'Agent',
      entityId: savedAgent.id,
      after: { referralCode: savedAgent.referral_code, name: savedUser.name },
    });

    // Mailtrap Notification: Send referral code to new agent & executive alert to owner
    this.mailService
      .sendAgentReferralCodeEmail(
        savedUser.email,
        savedUser.name,
        savedAgent.referral_code,
        initialPassword,
      )
      .catch(() => {});

    this.mailService
      .sendOwnerExecutiveAlert(
        'New Agent Partner Onboarded',
        'New Travel Partner Registered in Agency Network',
        {
          partner_name: savedUser.name,
          email: savedUser.email,
          referral_code: savedAgent.referral_code,
          assigned_manager_id: managerId || 'Direct Executive Assignment',
          bank_payout_details: data.payout_details || 'Pending bank account',
          registered_at: new Date().toISOString(),
        },
        'http://localhost:5173/dashboard/owner',
      )
      .catch(() => {});

    // Notify assigned manager or all managers
    if (managerId) {
      this.userRepo.findOne({ where: { id: managerId } }).then((mgr) => {
        if (mgr?.email) {
          this.mailService
            .sendManagerNotification(
              mgr.email,
              mgr.name,
              'Partner Agent Onboarded',
              `New Agent Assigned: ${savedUser.name} (${savedAgent.referral_code})`,
              {
                agent_name: savedUser.name,
                agent_email: savedUser.email,
                referral_code: savedAgent.referral_code,
                payout_account: data.payout_details || 'Pending bank account',
                registered_at: new Date().toISOString(),
              },
              'http://localhost:5173/dashboard/manager',
            )
            .catch(() => {});
        }
      });
    }

    return this.findOne(savedAgent.id);
  }

  async findAll(params: { search?: string; status?: string; managerId?: string }) {
    const query = this.agentRepo
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect('agent.manager', 'manager')
      .leftJoinAndSelect('agent.clients', 'clients');

    if (params.search) {
      query.andWhere(
        '(LOWER(user.name) LIKE LOWER(:s) OR LOWER(user.email) LIKE LOWER(:s) OR agent.referral_code LIKE :s)',
        { s: `%${params.search}%` },
      );
    }

    if (params.status === 'ACTIVE') {
      query.andWhere('agent.deactivated_at IS NULL');
    } else if (params.status === 'DEACTIVATED') {
      query.andWhere('agent.deactivated_at IS NOT NULL');
    }

    if (params.managerId) {
      query.andWhere('agent.manager_id = :mgrId', { mgrId: params.managerId });
    }

    query.orderBy('agent.created_at', 'DESC');
    return query.getMany();
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id },
      relations: ['user', 'manager', 'clients', 'clients.user'],
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async findByUserId(userId: string): Promise<Agent | null> {
    return this.agentRepo.findOne({
      where: { user_id: userId },
      relations: ['user', 'manager', 'clients', 'clients.user'],
    });
  }

  async toggleDeactivate(id: string, actorId?: string): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.deactivated_at = agent.deactivated_at ? null : new Date();
    await this.agentRepo.save(agent);

    await this.auditService.log({
      actorId,
      action: agent.deactivated_at ? 'AGENT_DEACTIVATED' : 'AGENT_ACTIVATED',
      entityType: 'Agent',
      entityId: id,
    });

    return agent;
  }

  async rotateReferralCode(id: string, actorId?: string): Promise<Agent> {
    const agent = await this.findOne(id);
    let newCode = this.generateReferralCode();
    let collision = await this.agentRepo.findOne({ where: { referral_code: newCode } });
    while (collision) {
      newCode = this.generateReferralCode();
      collision = await this.agentRepo.findOne({ where: { referral_code: newCode } });
    }

    const oldCode = agent.referral_code;
    agent.referral_code = newCode;
    await this.agentRepo.save(agent);

    await this.auditService.log({
      actorId,
      action: 'AGENT_REFERRAL_ROTATED',
      entityType: 'Agent',
      entityId: id,
      before: { referralCode: oldCode },
      after: { referralCode: newCode },
    });

    return agent;
  }

  async getPipelineStats(agentId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Daily Registered clients count
    const dailyRegisteredCount = await this.clientRepo
      .createQueryBuilder('client')
      .where('client.referred_by_agent_id = :agentId', { agentId })
      .andWhere('client.created_at >= :today', { today })
      .getCount();

    // Total clients count
    const totalClientsCount = await this.clientRepo
      .createQueryBuilder('client')
      .where('client.referred_by_agent_id = :agentId', { agentId })
      .getCount();

    // Pending Approval bookings
    const pendingCount = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.agent_id = :agentId', { agentId })
      .andWhere('booking.status = :status', { status: BookingStatus.PENDING })
      .getCount();

    // Rejected bookings
    const rejectedCount = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.agent_id = :agentId', { agentId })
      .andWhere('booking.status = :status', { status: BookingStatus.REJECTED })
      .getCount();

    // Approved bookings
    const approvedCount = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.agent_id = :agentId', { agentId })
      .andWhere('booking.status = :status', { status: BookingStatus.APPROVED })
      .getCount();

    // Full Client Pipeline Requests Ledger
    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .leftJoinAndSelect('booking.destination', 'destination')
      .where('booking.agent_id = :agentId OR client.referred_by_agent_id = :agentId', { agentId })
      .orderBy('booking.created_at', 'DESC')
      .getMany();

    // Referred Clients Roster
    const clients = await this.clientRepo
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.user', 'user')
      .where('client.referred_by_agent_id = :agentId', { agentId })
      .orderBy('client.created_at', 'DESC')
      .getMany();

    const agent = await this.agentRepo.findOne({ where: { id: agentId } });

    // Dynamic one-time referral codes generated by this agent
    const dynamicCodes = await this.dynamicCodeRepo.find({
      where: { agent_id: agentId },
      order: { created_at: 'DESC' },
    });

    const activeDynamic = dynamicCodes.find((d) => d.status === 'ACTIVE');

    return {
      dailyRegistered: dailyRegisteredCount,
      totalClients: totalClientsCount,
      pendingApproval: pendingCount,
      rejected: rejectedCount,
      approved: approvedCount,
      walletBalance: Number(agent?.wallet_balance || 0),
      referralCode: activeDynamic?.code || agent?.referral_code,
      primaryReferralCode: agent?.referral_code,
      activeDynamicCode: activeDynamic?.code || null,
      dynamicCodes: dynamicCodes.map((d) => ({
        id: d.id,
        code: d.code,
        clientEmail: d.client_email,
        clientName: d.client_name,
        personalNote: d.personal_note,
        status: d.status,
        sentCount: d.sent_count,
        lastSentAt: d.last_sent_at,
        createdAt: d.created_at,
        claimedAt: d.claimed_at,
      })),
      requests: bookings.map((b) => {
        const clientCreatedAt = b.client?.created_at ? new Date(b.client.created_at) : null;
        const isClientDailyRegistered = clientCreatedAt ? clientCreatedAt >= today : false;
        const totalPrice = Number(b.total_price);
        const commissionAmount = Math.round(totalPrice * 0.1 * 100) / 100; // 10% Automated Commission

        return {
          id: b.id,
          bookingRef: `ASK-${b.id.substring(0, 8).toUpperCase()}`,
          clientId: b.client_id,
          clientName: b.client?.user?.name || 'Valued Traveler',
          clientEmail: b.client?.user?.email || '',
          clientPhone: b.client?.user?.phone || 'Not provided',
          destinationId: b.destination_id,
          destinationTitle: b.destination?.title || 'Ethiopian Tour Package',
          destinationSlug: b.destination?.slug || '',
          destinationImage: b.destination?.gallery_images?.[0] || '',
          travelDate: b.travel_date,
          travelers: b.travelers,
          unitPrice: Number(b.unit_price),
          totalPrice,
          commissionAmount,
          commissionRate: 0.1,
          status: b.status,
          managerComment: b.manager_comment || '',
          clientNotes: b.client_notes || '',
          createdAt: b.created_at,
          approvedAt: b.approved_at,
          isDailyRegistered: isClientDailyRegistered,
        };
      }),
      clients: clients.map((c) => ({
        id: c.user_id,
        name: c.user?.name || 'Client',
        email: c.user?.email || '',
        phone: c.user?.phone || 'Not provided',
        createdAt: c.created_at,
        isToday: new Date(c.created_at) >= today,
      })),
    };
  }

  // Generate dynamic one-time referral code
  async generateDynamicReferralCode(
    agentId: string,
    data?: { clientEmail?: string; clientName?: string; personalNote?: string },
  ): Promise<AgentReferralCode> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = 'AGT-' + this.generateReferralCode(6);
      const col1 = await this.dynamicCodeRepo.findOne({ where: { code } });
      const col2 = await this.agentRepo.findOne({ where: { referral_code: code } });
      if (!col1 && !col2) isUnique = true;
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const dynamicCode = this.dynamicCodeRepo.create({
      agent_id: agentId,
      code,
      client_email: data?.clientEmail ? data.clientEmail.toLowerCase().trim() : null,
      client_name: data?.clientName ? data.clientName.trim() : null,
      personal_note: data?.personalNote ? data.personalNote.trim() : null,
      status: 'ACTIVE',
      sent_count: data?.clientEmail ? 1 : 0,
      last_sent_at: data?.clientEmail ? new Date() : null,
      expires_at: expiresAt,
    });

    return this.dynamicCodeRepo.save(dynamicCode);
  }

  // Send dynamic referral code email to client using client email address
  async sendReferralEmailToClient(
    agentUserId: string,
    data: { email: string; name?: string; personalNote?: string },
  ) {
    const agent = await this.agentRepo.findOne({
      where: { user_id: agentUserId },
      relations: ['user'],
    });
    if (!agent) {
      throw new NotFoundException('Agent profile not found for user');
    }

    if (!data.email || !data.email.includes('@')) {
      throw new BadRequestException('A valid client email address is required.');
    }

    const emailNorm = data.email.toLowerCase().trim();
    const clientName = data.name?.trim() || 'Valued Traveler';

    // Generate fresh dynamic one-time referral code
    const dynamicRecord = await this.generateDynamicReferralCode(agent.id, {
      clientEmail: emailNorm,
      clientName,
      personalNote: data.personalNote,
    });

    // Dispatch real email via Brevo / SMTP
    const dispatchRes = await this.mailService.sendClientReferralInviteEmail(
      emailNorm,
      clientName,
      agent.user?.name || 'Authorized Travel Partner',
      dynamicRecord.code,
      data.personalNote,
    );

    const isRealSent = dispatchRes.provider === 'brevo' || dispatchRes.provider === 'smtp';

    return {
      success: true,
      message: isRealSent
        ? `Real email with dynamic referral code ${dynamicRecord.code} was dispatched to ${emailNorm}!`
        : `Dynamic one-time referral code ${dynamicRecord.code} generated successfully!`,
      code: dynamicRecord.code,
      email: emailNorm,
      isRealSent,
      record: dynamicRecord,
    };
  }

  async getAgentDynamicCodes(agentId: string): Promise<AgentReferralCode[]> {
    return this.dynamicCodeRepo.find({
      where: { agent_id: agentId },
      order: { created_at: 'DESC' },
    });
  }

  async resendReferralEmail(agentUserId: string, codeId: string) {
    const agent = await this.agentRepo.findOne({
      where: { user_id: agentUserId },
      relations: ['user'],
    });
    if (!agent) throw new NotFoundException('Agent profile not found');

    const dynamicRecord = await this.dynamicCodeRepo.findOne({
      where: { id: codeId, agent_id: agent.id },
    });
    if (!dynamicRecord) throw new NotFoundException('Referral code record not found');
    if (!dynamicRecord.client_email) throw new BadRequestException('No client email associated with this code');
    if (dynamicRecord.status === 'CLAIMED') throw new BadRequestException('This code has already been claimed by a registered traveler');

    const dispatchRes = await this.mailService.sendClientReferralInviteEmail(
      dynamicRecord.client_email,
      dynamicRecord.client_name || 'Traveler',
      agent.user?.name || 'Travel Partner',
      dynamicRecord.code,
      dynamicRecord.personal_note,
    );

    dynamicRecord.sent_count = (dynamicRecord.sent_count || 1) + 1;
    dynamicRecord.last_sent_at = new Date();
    await this.dynamicCodeRepo.save(dynamicRecord);

    return {
      success: true,
      message: `Fresh invitation email with code ${dynamicRecord.code} was resent to ${dynamicRecord.client_email}!`,
      code: dynamicRecord.code,
      isRealSent: dispatchRes.provider === 'brevo' || dispatchRes.provider === 'smtp',
    };
  }

  async applyToJoinAgentNetwork(data: {
    name: string;
    email: string;
    phone?: string;
    payout_details?: string;
    city_or_region?: string;
    experience_notes?: string;
    password?: string;
  }) {
    const emailNorm = data.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email: emailNorm } });
    if (existing) {
      throw new ConflictException(
        'An account with this email address already exists in the system. Please log in or use a different email address.',
      );
    }

    const defaultPass = data.password && data.password.length >= 8 ? data.password : 'Agent@2026!';
    const password_hash = await bcrypt.hash(defaultPass, 12);
    const payout = data.payout_details || 'Commercial Bank of Ethiopia (CBE) / Telebirr';

    let pending = await this.pendingRepo.findOne({ where: { email: emailNorm } });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    if (!pending) {
      pending = this.pendingRepo.create({
        email: emailNorm,
        name: data.name.trim(),
        phone: data.phone || null,
        password_hash,
        role: 'AGENT',
        referral_code: 'PENDING_APPROVAL',
        payout_details: `${payout} | Location: ${data.city_or_region || 'Ethiopia'} | Experience: ${data.experience_notes || 'None provided'}`,
        attempts: 0,
        expires_at: expiresAt,
      });
    } else {
      pending.name = data.name.trim();
      pending.phone = data.phone || pending.phone;
      pending.password_hash = password_hash;
      pending.role = 'AGENT';
      pending.payout_details = `${payout} | Location: ${data.city_or_region || 'Ethiopia'} | Experience: ${data.experience_notes || 'None provided'}`;
      pending.expires_at = expiresAt;
    }
    await this.pendingRepo.save(pending);

    // Send confirmation email to applicant
    this.mailService
      .sendAgentApplicationReceivedEmail(emailNorm, data.name.trim())
      .catch((err) => console.error('Failed to send agent application received email:', err));

    // Send executive alert to System Owner / Manager
    const frontendUrl = process.env.FRONTEND_URL || 'https://admirable-unicorn-ec175c.netlify.app';
    this.mailService
      .sendOwnerExecutiveAlert(
        `New Travel Agent Application: ${data.name.trim()}`,
        'Candidate Submitted Partner Application for Review',
        {
          candidate_name: data.name.trim(),
          email: emailNorm,
          phone: data.phone || 'Not provided',
          payout_method: payout,
          operating_region: data.city_or_region || 'Not specified',
          experience_overview: data.experience_notes || 'Not specified',
          submitted_at: new Date().toISOString(),
        },
        `${frontendUrl}/dashboard/owner`,
      )
      .catch((err) => console.error('Failed to send owner executive alert:', err));

    return {
      success: true,
      message:
        'Your application to join the ASK Travel Agent Network has been submitted! Our Agency Manager and Owner have been notified, and an official confirmation email has been dispatched to your inbox.',
    };
  }

  async getPendingApplications() {
    return this.pendingRepo.find({
      where: { role: 'AGENT' },
      order: { created_at: 'DESC' },
    });
  }

  async approveApplication(applicationId: string, managerId: string) {
    const pending = await this.pendingRepo.findOne({ where: { id: applicationId } });
    if (!pending) {
      throw new NotFoundException('Pending agent application not found');
    }

    // Extract payout details
    const payout = pending.payout_details?.split('|')?.[0]?.trim() || pending.payout_details;

    // Register agent officially
    const result = await this.registerAgent(
      {
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        payout_details: payout,
      },
      managerId,
    );

    // Remove from pending registrations
    await this.pendingRepo.delete({ id: applicationId });

    return {
      success: true,
      message: `Agent ${pending.name} has been successfully approved and onboarded!`,
      agent: result,
    };
  }

  async rejectApplication(applicationId: string, managerId: string) {
    const pending = await this.pendingRepo.findOne({ where: { id: applicationId } });
    if (!pending) {
      throw new NotFoundException('Pending agent application not found');
    }

    await this.pendingRepo.delete({ id: applicationId });

    await this.auditService.log({
      actorId: managerId,
      action: 'AGENT_APPLICATION_REJECTED',
      entityType: 'PendingRegistration',
      entityId: applicationId,
      after: { name: pending.name, email: pending.email },
    });

    return {
      success: true,
      message: `Application for ${pending.name} has been rejected.`,
    };
  }
}
