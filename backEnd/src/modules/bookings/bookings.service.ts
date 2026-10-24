import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from '../../entities/booking.entity';
import { BookingStatusHistory } from '../../entities/booking-status-history.entity';
import { Destination } from '../../entities/destination.entity';
import { Agent } from '../../entities/agent.entity';
import { AgentReferralCode } from '../../entities/agent-referral-code.entity';
import { Client } from '../../entities/client.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { BookingStatus, DestinationStatus, WalletTxType } from '../../common/enums/domain.enums';
import { PermissionScope } from '../../common/enums/permissions.enum';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private historyRepo: Repository<BookingStatusHistory>,
    @InjectRepository(Destination)
    private destRepo: Repository<Destination>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(AgentReferralCode)
    private dynamicCodeRepo: Repository<AgentReferralCode>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private pricingService: PricingService,
    private auditService: AuditService,
    private mailService: MailService,
    private dataSource: DataSource,
  ) {}

  async createBooking(
    clientId: string,
    data: {
      destination_id: string;
      travel_date: string;
      travelers: number;
      client_notes?: string;
      idempotency_key?: string;
      referral_code?: string;
      booking_via_agent?: boolean;
    },
    actorId?: string,
  ): Promise<Booking> {
    if (data.idempotency_key) {
      const existing = await this.bookingRepo.findOne({
        where: { idempotency_key: data.idempotency_key },
        relations: ['destination', 'client', 'client.user'],
      });
      if (existing) {
        return existing;
      }
    }

    const dest = await this.destRepo.findOne({ where: { id: data.destination_id } });
    if (!dest || dest.status !== DestinationStatus.ACTIVE || dest.deleted_at) {
      throw new BadRequestException('Destination is not active or available for booking.');
    }

    if (new Date(data.travel_date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new BadRequestException('Travel date must be in the future.');
    }

    const travelers = Math.max(1, data.travelers || 1);

    // Calculate effective price snapshot (FR-PRC-03 & FR-PRC-04)
    const { effectivePrice, appliedRuleId } = await this.pricingService.calculateEffectivePrice(
      dest.id,
      data.travel_date,
    );

    const totalPrice = Math.round(effectivePrice * travelers * 100) / 100;

    // Rule: If client books by self: no agent commission, no referral code needed.
    // If client books using agent: referral code is MANDATORY.
    let agentId: string | null = null;

    if (data.booking_via_agent && (!data.referral_code || !data.referral_code.trim())) {
      throw new BadRequestException(
        'Agent referral code is mandatory when booking with Travel Agent assistance. If you are booking directly by yourself, select Direct Booking.',
      );
    }

    if (data.referral_code && data.referral_code.trim()) {
      const cleanCode = data.referral_code.trim().toUpperCase();
      let agent = await this.agentRepo.findOne({ where: { referral_code: cleanCode } });
      if (!agent) {
        const dynamic = await this.dynamicCodeRepo.findOne({ where: { code: cleanCode } });
        if (dynamic) {
          agent = await this.agentRepo.findOne({ where: { id: dynamic.agent_id } });
        }
      }

      if (!agent || agent.deactivated_at) {
        throw new BadRequestException(`Agent referral code "${cleanCode}" is invalid or no longer active.`);
      }
      agentId = agent.id;

      // Associate with client profile
      const client = await this.clientRepo.findOne({ where: { user_id: clientId } });
      if (client) {
        client.referred_by_agent_id = agent.id;
        client.referral_code_used = cleanCode;
        await this.clientRepo.save(client);
      }
    } else {
      // Direct booking by self: 0 agent commission, agentId = null
      agentId = null;
    }

    const booking = this.bookingRepo.create({
      client_id: clientId,
      destination_id: dest.id,
      agent_id: agentId,
      travel_date: data.travel_date,
      travelers,
      unit_price: effectivePrice,
      total_price: totalPrice,
      applied_rule_id: appliedRuleId,
      status: BookingStatus.PENDING,
      client_notes: data.client_notes,
      idempotency_key: data.idempotency_key,
    });

    const savedBooking = await this.bookingRepo.save(booking);

    // Record initial status history
    await this.historyRepo.save(
      this.historyRepo.create({
        booking_id: savedBooking.id,
        from_status: null,
        to_status: BookingStatus.PENDING,
        actor_id: actorId || clientId,
        comment: 'Booking request submitted',
      }),
    );

    // Notify Managers
    const managers = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.userRoles', 'ur')
      .innerJoin('ur.role', 'r')
      .where('r.role_name IN (:...roles)', { roles: ['MANAGER', 'OWNER'] })
      .getMany();

    for (const mgr of managers) {
      await this.notifRepo.save(
        this.notifRepo.create({
          user_id: mgr.id,
          type: 'BOOKING_CREATED',
          title: 'New Booking Request',
          body: `New booking request for ${dest.title} (${travelers} traveler(s), ${totalPrice} ETB).`,
          ref_type: 'Booking',
          ref_id: savedBooking.id,
        }),
      );
    }

    await this.auditService.log({
      actorId: actorId || clientId,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: savedBooking.id,
      after: { destination: dest.title, totalPrice, travelers },
    });

    // Multi-Party Email Notifications (Client, Managers, Owner)
    this.userRepo.findOne({ where: { id: clientId } }).then((clientUser) => {
      if (clientUser?.email) {
        this.mailService
          .sendBookingConfirmationToClient(clientUser.email, clientUser.name, {
            bookingRef: savedBooking.id.substring(0, 8).toUpperCase(),
            destinationTitle: dest.title,
            travelDate: data.travel_date,
            travelers,
            totalPrice,
            status: 'PENDING APPROVAL',
          })
          .catch(() => {});
      }
    });

    for (const mgr of managers) {
      if (mgr.email && mgr.email !== this.mailService.getOwnerEmail()) {
        this.mailService
          .sendManagerNotification(
            mgr.email,
            mgr.name,
            'New Booking Request',
            `Moderation Required: ${dest.title} (${travelers} travelers)`,
            {
              booking_reference: savedBooking.id.substring(0, 8).toUpperCase(),
              destination: dest.title,
              travel_date: data.travel_date,
              travelers: `${travelers} Pax`,
              total_price: `${totalPrice.toLocaleString()} ETB`,
              submitted_at: new Date().toISOString(),
            },
            'http://localhost:5173/dashboard/manager',
          )
          .catch(() => {});
      }
    }

    // Mailtrap Executive Alert: Notify Agency Owner of New Reservation
    this.mailService
      .sendOwnerExecutiveAlert(
        `New Reservation Awaiting Moderation: ${dest.title}`,
        'New Client Tour Reservation Placed',
        {
          booking_reference: savedBooking.id.substring(0, 8).toUpperCase(),
          destination: dest.title,
          scheduled_travel_date: data.travel_date,
          travelers_count: travelers,
          total_booking_value: `${totalPrice.toLocaleString()} ETB`,
          referring_agent_id: agentId || 'Direct Organic Client',
          submitted_at: new Date().toISOString(),
        },
        'http://localhost:5173/dashboard/owner',
      )
      .catch(() => {});

    return this.findOne(savedBooking.id);
  }

  async approveBooking(
    bookingId: string,
    managerId: string,
    comment?: string,
  ): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      // Row-level locking to prevent race conditions or double approval
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      booking.destination = (await manager.getRepository(Destination).findOne({ where: { id: booking.destination_id } })) || undefined;
      booking.client = (await manager.getRepository(Client).findOne({ where: { user_id: booking.client_id }, relations: ['user'] })) || undefined;

      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(
          `Cannot approve booking in status "${booking.status}". Only PENDING bookings can be approved.`,
        );
      }

      const prevStatus = booking.status;
      booking.status = BookingStatus.APPROVED;
      booking.approved_by = managerId;
      booking.approved_at = new Date();
      if (comment) {
        booking.manager_comment = comment;
      }

      await manager.getRepository(Booking).save(booking);

      // Status history
      await manager.getRepository(BookingStatusHistory).save(
        manager.getRepository(BookingStatusHistory).create({
          booking_id: booking.id,
          from_status: prevStatus,
          to_status: BookingStatus.APPROVED,
          actor_id: managerId,
          comment: comment || 'Booking approved by manager',
        }),
      );

      // Automated 10% agent commission credit (FR-COM-01 & FR-COM-02)
      if (booking.agent_id) {
        const agent = await manager
          .getRepository(Agent)
          .createQueryBuilder('agent')
          .setLock('pessimistic_write')
          .where('agent.id = :id', { id: booking.agent_id })
          .getOne();

        if (agent) {
          const agentUser = await manager
            .getRepository(User)
            .findOne({ where: { id: agent.user_id } });

          // Check if commission already credited
          const existingCredit = await manager.getRepository(WalletTransaction).findOne({
            where: {
              booking_id: booking.id,
              type: WalletTxType.COMMISSION_CREDIT,
            },
          });

          if (!existingCredit) {
            const commissionRate = 0.1; // 10%
            const commissionAmount = Math.round(Number(booking.total_price) * commissionRate * 100) / 100;
            const currentBalance = Number(agent.wallet_balance);
            const newBalance = Math.round((currentBalance + commissionAmount) * 100) / 100;

            agent.wallet_balance = newBalance;
            await manager.getRepository(Agent).save(agent);

            // Record immutable ledger entry
            await manager.getRepository(WalletTransaction).save(
              manager.getRepository(WalletTransaction).create({
                agent_id: agent.id,
                booking_id: booking.id,
                type: WalletTxType.COMMISSION_CREDIT,
                amount: commissionAmount,
                rate_used: commissionRate,
                balance_after: newBalance,
                reference: `Commission for booking #${booking.id.substring(0, 8)}`,
                created_by: managerId,
              }),
            );

            // Notify Agent
            await manager.getRepository(Notification).save(
              manager.getRepository(Notification).create({
                user_id: agent.user_id,
                type: 'COMMISSION_CREDITED',
                title: 'Commission Credited',
                body: `+${commissionAmount.toFixed(2)} ETB commission credited for approved booking (${booking.destination?.title || 'Tour'}).`,
                ref_type: 'Booking',
                ref_id: booking.id,
              }),
            );

            // Instant Financial Dispatch: Email alert to Agent
            if (agentUser?.email) {
              this.mailService
                .sendAgentCommissionEmail(agentUser.email, agentUser.name || 'Partner Agent', {
                  commissionAmount,
                  bookingRef: booking.id.substring(0, 8).toUpperCase(),
                  destinationTitle: booking.destination?.title || 'Ethiopian Tour',
                  clientName: booking.client?.user?.name || 'Valued Client',
                  totalPrice: Number(booking.total_price),
                  newBalance,
                })
                .catch((err) =>
                  this.logger.warn(`Failed to dispatch commission email to agent: ${err.message}`),
                );
            }
          }
        }
      }

      // Notify Client
      await manager.getRepository(Notification).save(
        manager.getRepository(Notification).create({
          user_id: booking.client_id,
          type: 'BOOKING_APPROVED',
          title: 'Booking Approved!',
          body: `Your booking for ${booking.destination.title} on ${booking.travel_date} has been confirmed.`,
          ref_type: 'Booking',
          ref_id: booking.id,
        }),
      );

      await this.auditService.log({
        actorId: managerId,
        action: 'BOOKING_APPROVED',
        entityType: 'Booking',
        entityId: booking.id,
        after: { status: BookingStatus.APPROVED, comment },
      });

      // Multi-Party Email Delivery on Approval (Client, Manager, Owner)
      const clientUser = booking.client?.user || (await manager.getRepository(User).findOne({ where: { id: booking.client_id } }));
      if (clientUser?.email) {
        this.mailService
          .sendBookingConfirmationToClient(clientUser.email, clientUser.name, {
            bookingRef: booking.id.substring(0, 8).toUpperCase(),
            destinationTitle: booking.destination?.title || 'Ethiopian Tour',
            travelDate: booking.travel_date,
            travelers: booking.travelers,
            totalPrice: Number(booking.total_price),
            status: 'CONFIRMED / APPROVED',
          })
          .catch(() => {});
      }

      manager.getRepository(User).findOne({ where: { id: managerId } }).then((mgr) => {
        if (mgr?.email) {
          this.mailService
            .sendManagerNotification(
              mgr.email,
              mgr.name,
              'Booking Approval Confirmed',
              `Tour Reservation #${booking.id.substring(0, 8).toUpperCase()} Confirmed`,
              {
                booking_reference: booking.id.substring(0, 8).toUpperCase(),
                destination: booking.destination?.title || 'Ethiopian Tour',
                travel_date: booking.travel_date,
                travelers: `${booking.travelers} Pax`,
                total_booking_value: `${Number(booking.total_price).toLocaleString()} ETB`,
                client_name: clientUser?.name || 'Traveler',
                confirmed_at: new Date().toISOString(),
              },
              'http://localhost:5173/dashboard/manager',
            )
            .catch(() => {});
        }
      });

      this.mailService
        .sendOwnerExecutiveAlert(
          `Booking Approved: #${booking.id.substring(0, 8).toUpperCase()} — ${booking.destination?.title || 'Tour'}`,
          'Tour Reservation Approved & Confirmed',
          {
            booking_reference: booking.id.substring(0, 8).toUpperCase(),
            destination: booking.destination?.title || 'Tour Circuit',
            travel_date: booking.travel_date,
            travelers: booking.travelers,
            total_price: `${Number(booking.total_price).toLocaleString()} ETB`,
            approved_by_manager_id: managerId,
            confirmed_at: new Date().toISOString(),
          },
          'http://localhost:5173/dashboard/owner',
        )
        .catch(() => {});

      return booking;
    });
  }

  async rejectBooking(
    bookingId: string,
    managerId: string,
    reason: string,
  ): Promise<Booking> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A reason is mandatory when rejecting a booking.');
    }

    return this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      booking.destination = (await manager.getRepository(Destination).findOne({ where: { id: booking.destination_id } })) || undefined;

      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException(
          `Cannot reject booking in status "${booking.status}". Only PENDING bookings can be rejected.`,
        );
      }

      const prevStatus = booking.status;
      booking.status = BookingStatus.REJECTED;
      booking.manager_comment = reason;
      await manager.getRepository(Booking).save(booking);

      await manager.getRepository(BookingStatusHistory).save(
        manager.getRepository(BookingStatusHistory).create({
          booking_id: booking.id,
          from_status: prevStatus,
          to_status: BookingStatus.REJECTED,
          actor_id: managerId,
          comment: reason,
        }),
      );

      // Notify client
      await manager.getRepository(Notification).save(
        manager.getRepository(Notification).create({
          user_id: booking.client_id,
          type: 'BOOKING_REJECTED',
          title: 'Booking Request Rejected',
          body: `Your booking request for ${booking.destination.title} was rejected. Reason: ${reason}`,
          ref_type: 'Booking',
          ref_id: booking.id,
        }),
      );

      await this.auditService.log({
        actorId: managerId,
        action: 'BOOKING_REJECTED',
        entityType: 'Booking',
        entityId: booking.id,
        after: { status: BookingStatus.REJECTED, reason },
      });

      return booking;
    });
  }

  calculateCancellation(booking: Booking, cancelDate: Date = new Date()) {
    const travelDate = new Date(`${booking.travel_date}T00:00:00`);
    const today = new Date(cancelDate);
    today.setHours(0, 0, 0, 0);
    travelDate.setHours(0, 0, 0, 0);

    // 1. Client can cancel reservation until the travel day presents
    if (today >= travelDate) {
      throw new BadRequestException(
        'Cancellation is not permitted on or after the scheduled travel day.',
      );
    }

    // 2. Calculate days elapsed from booking approval (or creation if pending)
    const baseDate = new Date(booking.approved_at || booking.created_at);
    baseDate.setHours(0, 0, 0, 0);
    const diffMs = Math.max(0, today.getTime() - baseDate.getTime());
    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

    // Tier 1: 1 up to 5 days -> 2%
    // Tier 2: 6 up to 10 days -> 4%
    // Tier 3: 10 days and above -> 8%
    let penaltyRate = 0.02;
    let tierDescription = '1 up to 5 days (2% penalty)';

    if (diffDays <= 5) {
      penaltyRate = 0.02;
      tierDescription = '1 up to 5 days (2% penalty)';
    } else if (diffDays <= 10) {
      penaltyRate = 0.04;
      tierDescription = '6 up to 10 days (4% penalty)';
    } else {
      penaltyRate = 0.08;
      tierDescription = '10 days and above (8% penalty)';
    }

    const totalAmount = Number(booking.total_price);
    const penaltyFee = Math.round(totalAmount * penaltyRate * 100) / 100;
    const refundAmount = Math.round((totalAmount - penaltyFee) * 100) / 100;

    // Advisor rule 2: Manager does NOT have any commissions.
    // ONLY the agent can have commission, and ONLY IF that client is referenced by the agent.
    const managerCommission = 0;

    // Agent commission from penalty: penalty amount * agent commission rate (only if client was referred by agent)
    const agentCommission = booking.agent_id ? Math.round(penaltyFee * penaltyRate * 100) / 100 : 0;
    const agencyRetained = Math.round((penaltyFee - agentCommission) * 100) / 100;

    return {
      diffDays,
      penaltyRate,
      penaltyPercentage: Math.round(penaltyRate * 100),
      tierDescription,
      totalAmount,
      penaltyFee,
      refundAmount,
      managerCommission,
      agentCommission,
      agencyRetained,
    };
  }

  async cancelBooking(
    bookingId: string,
    actorId: string,
    reason?: string,
  ): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id: bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      booking.destination = (await manager.getRepository(Destination).findOne({ where: { id: booking.destination_id } })) || undefined;
      if (booking.agent_id) {
        booking.agent = (await manager.getRepository(Agent).findOne({ where: { id: booking.agent_id } })) || undefined;
      }

      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.APPROVED
      ) {
        throw new ConflictException(
          `Cannot cancel booking in status "${booking.status}".`,
        );
      }

      const prevStatus = booking.status;
      const calc = this.calculateCancellation(booking);

      booking.status = BookingStatus.CANCELLED;
      booking.penalty_fee = calc.penaltyFee;
      booking.refund_amount = calc.refundAmount;
      booking.cancelled_at = new Date();

      const reasonFormatted = reason && reason.trim() ? reason.trim() : 'Client requested cancellation';
      booking.manager_comment = booking.manager_comment
        ? `${booking.manager_comment} | Cancellation: ${calc.tierDescription}. Reason: ${reasonFormatted}`
        : `Cancellation: ${calc.tierDescription}. Reason: ${reasonFormatted}`;

      await manager.getRepository(Booking).save(booking);

      // Record status transition
      await manager.getRepository(BookingStatusHistory).save(
        manager.getRepository(BookingStatusHistory).create({
          booking_id: booking.id,
          from_status: prevStatus,
          to_status: BookingStatus.CANCELLED,
          actor_id: actorId,
          comment: `Cancelled with ${calc.penaltyPercentage}% penalty (${calc.penaltyFee.toFixed(2)} ETB). Agent comm: ${calc.agentCommission.toFixed(2)} ETB. Refund: ${calc.refundAmount.toFixed(2)} ETB. Reason: ${reasonFormatted}`,
        }),
      );

      // Reversal of agent commission if booking was APPROVED, and credit of penalty commission
      if (prevStatus === BookingStatus.APPROVED && booking.agent_id) {
        const agent = await manager
          .getRepository(Agent)
          .createQueryBuilder('agent')
          .setLock('pessimistic_write')
          .where('agent.id = :id', { id: booking.agent_id })
          .getOne();

        if (agent) {
          const commissionCredit = await manager.getRepository(WalletTransaction).findOne({
            where: {
              booking_id: booking.id,
              type: WalletTxType.COMMISSION_CREDIT,
            },
          });

          if (commissionCredit) {
            const existingReversal = await manager.getRepository(WalletTransaction).findOne({
              where: {
                booking_id: booking.id,
                type: WalletTxType.COMMISSION_REVERSAL,
              },
            });

            if (!existingReversal) {
              const fullCommissionAmount = Number(commissionCredit.amount);
              let currentBalance = Number(agent.wallet_balance);
              let newBalance = Math.round((currentBalance - fullCommissionAmount) * 100) / 100;

              agent.wallet_balance = newBalance;
              await manager.getRepository(Agent).save(agent);

              await manager.getRepository(WalletTransaction).save(
                manager.getRepository(WalletTransaction).create({
                  agent_id: agent.id,
                  booking_id: booking.id,
                  type: WalletTxType.COMMISSION_REVERSAL,
                  amount: -fullCommissionAmount,
                  rate_used: commissionCredit.rate_used,
                  balance_after: newBalance,
                  reference: `Reversal for cancelled booking #${booking.id.substring(0, 8)}`,
                  created_by: actorId,
                }),
              );

              // Now credit agent's commission on the penalty (2%, 4%, or 8% of the penalty)
              if (calc.agentCommission > 0) {
                currentBalance = Number(agent.wallet_balance);
                newBalance = Math.round((currentBalance + calc.agentCommission) * 100) / 100;
                agent.wallet_balance = newBalance;
                await manager.getRepository(Agent).save(agent);

                await manager.getRepository(WalletTransaction).save(
                  manager.getRepository(WalletTransaction).create({
                    agent_id: agent.id,
                    booking_id: booking.id,
                    type: WalletTxType.COMMISSION_CREDIT,
                    amount: calc.agentCommission,
                    rate_used: calc.penaltyRate,
                    balance_after: newBalance,
                    reference: `Penalty commission (${calc.penaltyPercentage}%) for cancelled booking #${booking.id.substring(0, 8)}`,
                    created_by: actorId,
                  }),
                );

                await manager.getRepository(Notification).save(
                  manager.getRepository(Notification).create({
                    user_id: agent.user_id,
                    type: 'COMMISSION_CREDITED',
                    title: 'Cancellation Penalty Commission',
                    body: `+${calc.agentCommission.toFixed(2)} ETB credited (${calc.penaltyPercentage}% of penalty) for cancelled booking #${booking.id.substring(0, 8)}.`,
                    ref_type: 'Booking',
                    ref_id: booking.id,
                  }),
                );
              }
            }
          }
        }
      }

      // Notify Client with refund breakdown
      await manager.getRepository(Notification).save(
        manager.getRepository(Notification).create({
          user_id: booking.client_id,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled & Refund Processed',
          body: `Your booking for ${booking.destination.title} has been cancelled (${calc.tierDescription}). Penalty (${calc.penaltyPercentage}%): ${calc.penaltyFee.toFixed(2)} ETB. Refund: ${calc.refundAmount.toFixed(2)} ETB. Download your official cancellation statement in your dashboard.`,
          ref_type: 'Booking',
          ref_id: booking.id,
        }),
      );

      // Notify Managers
      const approvingManagerId = booking.approved_by;
      const managers = await manager
        .getRepository(User)
        .createQueryBuilder('u')
        .innerJoin('u.userRoles', 'ur')
        .innerJoin('ur.role', 'r')
        .where('r.role_name IN (:...roles)', { roles: ['MANAGER', 'OWNER'] })
        .getMany();

      for (const mgr of managers) {
        await manager.getRepository(Notification).save(
          manager.getRepository(Notification).create({
            user_id: mgr.id,
            type: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled by Traveler',
            body: `Booking for ${booking.destination.title} cancelled. Penalty collected: ${calc.penaltyFee.toFixed(2)} ETB (${calc.tierDescription}). Refund remitted: ${calc.refundAmount.toFixed(2)} ETB.`,
            ref_type: 'Booking',
            ref_id: booking.id,
          }),
        );
      }

      await this.auditService.log({
        actorId,
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: booking.id,
        after: {
          status: BookingStatus.CANCELLED,
          totalAmount: calc.totalAmount,
          diffDays: calc.diffDays,
          penaltyRate: `${calc.penaltyPercentage}%`,
          penaltyFee: calc.penaltyFee,
          refundAmount: calc.refundAmount,
          managerCommission: 0,
          agentCommission: calc.agentCommission,
          reason: reasonFormatted,
        },
      });

      // Multi-Party Email Delivery on Cancellation (Client, Managers, Owner)
      const clientUser = await manager.getRepository(User).findOne({ where: { id: booking.client_id } });
      if (clientUser?.email) {
        this.mailService
          .sendCancellationNoticeToClient(clientUser.email, clientUser.name, {
            bookingRef: booking.id.substring(0, 8).toUpperCase(),
            destinationTitle: booking.destination?.title || 'Ethiopian Tour',
            originalPrice: calc.totalAmount,
            penaltyFee: calc.penaltyFee,
            penaltyPercentage: calc.penaltyPercentage,
            refundAmount: calc.refundAmount,
            refundDestination: 'Telebirr / CBE Reversal',
            reason: reasonFormatted,
          })
          .catch(() => {});
      }

      for (const mgr of managers) {
        if (mgr.email && mgr.email !== this.mailService.getOwnerEmail()) {
          this.mailService
            .sendManagerNotification(
              mgr.email,
              mgr.name,
              'Booking Cancellation Notice',
              `Booking #${booking.id.substring(0, 8).toUpperCase()} Cancelled (${calc.tierDescription})`,
              {
                booking_reference: booking.id.substring(0, 8).toUpperCase(),
                destination: booking.destination?.title || 'Tour Circuit',
                original_booking_total: `${calc.totalAmount.toLocaleString()} ETB`,
                penalty_collected: `${calc.penaltyFee.toFixed(2)} ETB (${calc.penaltyPercentage}%)`,
                agent_penalty_commission: booking.agent_id ? `${calc.agentCommission.toFixed(2)} ETB` : '0.00 ETB (Direct Client)',
                refund_disbursed_to_client: `${calc.refundAmount.toFixed(2)} ETB`,
                agency_retained_balance: `${calc.agencyRetained.toFixed(2)} ETB`,
                cancellation_reason: reasonFormatted,
                settled_at: new Date().toISOString(),
              },
              'http://localhost:5173/dashboard/manager',
            )
            .catch(() => {});
        }
      }

      // Mailtrap Executive Alert: Notify Agency Owner of Cancellation & Financial Penalty Breakdown
      this.mailService
        .sendOwnerExecutiveAlert(
          `Booking #${booking.id.substring(0, 8).toUpperCase()} Cancelled — ${calc.tierDescription}`,
          'Expedition Cancellation & Financial Settlement Notice',
          {
            booking_reference: booking.id.substring(0, 8).toUpperCase(),
            destination: booking.destination?.title || 'Tour Circuit',
            cancellation_tier: calc.tierDescription,
            days_elapsed: `${calc.diffDays} day(s)`,
            original_booking_total: `${calc.totalAmount.toLocaleString()} ETB`,
            penalty_fee_deducted: `${calc.penaltyFee.toFixed(2)} ETB (${calc.penaltyPercentage}%)`,
            net_refund_disbursed: `${calc.refundAmount.toFixed(2)} ETB (${100 - calc.penaltyPercentage}%)`,
            agent_penalty_commission: booking.agent_id ? `${calc.agentCommission.toFixed(2)} ETB` : '0.00 ETB (Direct Booking)',
            agency_retained_balance: `${calc.agencyRetained.toFixed(2)} ETB`,
            cancellation_reason: reasonFormatted,
            processed_at: new Date().toISOString(),
          },
          'http://localhost:5173/dashboard/owner',
        )
        .catch(() => {});

      return booking;
    });
  }

  async completeBooking(bookingId: string, managerId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.status !== BookingStatus.APPROVED) {
      throw new ConflictException(`Only APPROVED bookings can be marked COMPLETED.`);
    }

    const prevStatus = booking.status;
    booking.status = BookingStatus.COMPLETED;
    booking.completed_at = new Date();
    await this.bookingRepo.save(booking);

    // Increment popularity score of destination
    await this.destRepo.increment({ id: booking.destination_id }, 'popularity_score', 1);

    await this.historyRepo.save(
      this.historyRepo.create({
        booking_id: booking.id,
        from_status: prevStatus,
        to_status: BookingStatus.COMPLETED,
        actor_id: managerId,
        comment: 'Tour completed successfully',
      }),
    );

    await this.auditService.log({
      actorId: managerId,
      action: 'BOOKING_COMPLETED',
      entityType: 'Booking',
      entityId: booking.id,
    });

    return booking;
  }

  async findAll(params: {
    status?: BookingStatus;
    destinationId?: string;
    agentId?: string;
    search?: string;
    page?: number;
    limit?: number;
    scope?: PermissionScope;
    currentUserId?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);

    const query = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.destination', 'destination')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .leftJoinAndSelect('booking.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .leftJoinAndSelect('booking.statusHistory', 'statusHistory');

    // Scope check
    if (params.scope === PermissionScope.OWN) {
      query.andWhere('booking.client_id = :userId', { userId: params.currentUserId });
    } else if (params.scope === PermissionScope.ASSIGNED) {
      const agent = await this.agentRepo.findOne({ where: { user_id: params.currentUserId } });
      if (agent) {
        query.andWhere('booking.agent_id = :agentId', { agentId: agent.id });
      } else {
        query.andWhere('booking.client_id = :userId', { userId: params.currentUserId });
      }
    }

    if (params.status) {
      query.andWhere('booking.status = :status', { status: params.status });
    }

    if (params.destinationId) {
      query.andWhere('booking.destination_id = :destId', { destId: params.destinationId });
    }

    if (params.agentId) {
      query.andWhere('booking.agent_id = :agentId', { agentId: params.agentId });
    }

    if (params.search) {
      query.andWhere(
        '(LOWER(destination.title) LIKE LOWER(:s) OR LOWER(clientUser.name) LIKE LOWER(:s) OR LOWER(clientUser.email) LIKE LOWER(:s))',
        { s: `%${params.search}%` },
      );
    }

    query.orderBy('booking.created_at', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: [
        'destination',
        'client',
        'client.user',
        'agent',
        'agent.user',
        'statusHistory',
        'walletTransactions',
      ],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async getCancelPreview(id: string) {
    const booking = await this.findOne(id);
    const calc = this.calculateCancellation(booking);

    return {
      bookingId: booking.id,
      totalAmount: calc.totalAmount,
      diffDays: calc.diffDays,
      penaltyRate: `${calc.penaltyPercentage}%`,
      tierDescription: calc.tierDescription,
      penaltyFee: calc.penaltyFee,
      refundRate: `${100 - calc.penaltyPercentage}%`,
      refundAmount: calc.refundAmount,
      managerCommission: calc.managerCommission,
      agentCommission: calc.agentCommission,
      agencyRetained: calc.agencyRetained,
      status: booking.status,
    };
  }

  async addComment(bookingId: string, actorId: string, comment: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (!comment || comment.trim().length === 0) {
      throw new BadRequestException('Comment text is required.');
    }
    booking.manager_comment = comment.trim();
    await this.bookingRepo.save(booking);

    // Notify Client of comment or availability update
    await this.notifRepo.save(
      this.notifRepo.create({
        user_id: booking.client_id,
        type: 'BOOKING_UPDATE',
        title: 'Booking Update / Availability Notice',
        body: `Agency update for ${booking.destination?.title || 'your trip'}: ${comment.trim()}`,
        ref_type: 'Booking',
        ref_id: booking.id,
      }),
    );

    await this.auditService.log({
      actorId,
      action: 'BOOKING_COMMENT_ADDED',
      entityType: 'Booking',
      entityId: booking.id,
      after: { comment: booking.manager_comment },
    });

    return booking;
  }

  async generateBookingPdf(
    bookingId: string,
    actorId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const booking = await this.findOne(bookingId);
    const isCancelled = booking.status === BookingStatus.CANCELLED;
    const isApproved = booking.status === BookingStatus.APPROVED;

    // Requirement: 1st download is marked "ORIGINAL", 2nd download and above is marked "COPY"
    const currentDownloads = Number(booking.download_count) || 0;
    const isFirstDownload = currentDownloads === 0;
    const documentMark = isFirstDownload ? 'ORIGINAL' : 'COPY';

    // Increment download counter in database
    await this.bookingRepo.update(booking.id, {
      download_count: currentDownloads + 1,
    });

    const filename = isCancelled
      ? `ASK_Cancellation_Statement_${documentMark}_${booking.id.substring(0, 8).toUpperCase()}.pdf`
      : `ASK_Booking_Voucher_${documentMark}_${booking.id.substring(0, 8).toUpperCase()}.pdf`;

    // Compute or retrieve cancellation calculation
    let calc: any;
    try {
      calc = this.calculateCancellation(booking, booking.cancelled_at || new Date());
    } catch {
      calc = {
        diffDays: 1,
        penaltyPercentage: 2,
        tierDescription: '1 up to 5 days (2% penalty)',
        penaltyFee: Number(booking.penalty_fee) || 0,
        refundAmount: Number(booking.refund_amount) || Number(booking.total_price),
        managerCommission: 0,
        agentCommission: booking.agent_id ? Math.round(Number(booking.penalty_fee) * 0.02 * 100) / 100 : 0,
        agencyRetained: Number(booking.penalty_fee) || 0,
      };
    }

    const penaltyFee = Number(booking.penalty_fee) > 0 ? Number(booking.penalty_fee) : calc.penaltyFee;
    const refundAmount = Number(booking.refund_amount) > 0 ? Number(booking.refund_amount) : calc.refundAmount;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', async () => {
        const buffer = Buffer.concat(buffers);
        await this.auditService.log({
          actorId,
          action: isCancelled ? 'BOOKING_CANCEL_STATEMENT_DOWNLOADED' : 'BOOKING_VOUCHER_DOWNLOADED',
          entityType: 'Booking',
          entityId: booking.id,
          after: { documentMark, downloadNumber: currentDownloads + 1 },
        });
        resolve({ buffer, filename });
      });
      doc.on('error', (err: any) => reject(err));

      const primaryColor = isCancelled ? '#991B1B' : '#8C4E1C';

      // 1. Header Banner
      doc.rect(36, 36, 523, 60).fill('#1C1917');
      doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('ASK TOURS — ETHIOPIA PREMIER TRAVEL', 48, 48);
      doc.fontSize(8).font('Helvetica').fillColor('#D6D3D1').text('Licensed Ethiopian Tour Operator | Bahir Dar Operations HQ | Kebele 04, Amhara Region', 48, 68);
      doc.fontSize(8).font('Helvetica').fillColor('#F59E0B').text('24/7 Concierge Hotline: +251 58 220 1234 | concierge@askdigital.et | www.asktours.et', 48, 79);

      // Official Issuance Stamp Badge in Header Banner
      const badgeBg = isFirstDownload ? '#065F46' : '#991B1B';
      const badgeBorder = isFirstDownload ? '#34D399' : '#F87171';
      doc.roundedRect(446, 46, 102, 20, 5).fillAndStroke(badgeBg, badgeBorder);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        isFirstDownload ? '● ORIGINAL' : '● COPY',
        446, 51.5, { align: 'center', width: 102 }
      );

      // 2. Document Title Bar
      const titleY = 104;
      doc.rect(36, titleY, 523, 26).fill(isCancelled ? '#FEE2E2' : '#FEF3C7');
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(primaryColor).text(
        isCancelled ? 'OFFICIAL CANCELLATION NOTICE & PENALTY STATEMENT' : 'OFFICIAL EXPEDITION BOOKING CONFIRMATION VOUCHER',
        48, titleY + 7
      );

      const statusText = isCancelled ? 'STATUS: CANCELLED' : isApproved ? 'STATUS: CONFIRMED' : 'STATUS: PENDING REVIEW';
      const statusColor = isCancelled ? '#DC2626' : isApproved ? '#059669' : '#D97706';
      doc.fontSize(9).font('Helvetica-Bold').fillColor(statusColor).text(
        `${statusText} [${documentMark}]`,
        370, titleY + 7, { align: 'right', width: 175 }
      );

      // Background Watermark: ORIGINAL or COPY
      doc.save();
      doc.rotate(-30, { origin: [297, 420] });
      if (isFirstDownload) {
        doc.fontSize(66).font('Helvetica-Bold').fillColor('#059669', 0.05);
        doc.text('ORIGINAL', 140, 395, { align: 'center', width: 314 });
      } else {
        doc.fontSize(76).font('Helvetica-Bold').fillColor('#DC2626', 0.08);
        doc.text('COPY', 160, 390, { align: 'center', width: 274 });
      }
      doc.restore();

      // 3. Client & Tour Details Box (Two Columns)
      const boxY = 138;
      doc.rect(36, boxY, 255, 96).strokeColor('#E7E5E4').stroke();
      doc.rect(298, boxY, 261, 96).strokeColor('#E7E5E4').stroke();

      // Left Box: Client Details
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#44403C').text('TRAVELER & RESERVATION DETAILS', 46, boxY + 8);
      doc.moveTo(46, boxY + 20).lineTo(280, boxY + 20).strokeColor('#E7E5E4').stroke();

      doc.font('Helvetica').fontSize(8).fillColor('#1C1917');
      doc.text(`Booking Ref: #${booking.id.substring(0, 8).toUpperCase()}`, 46, boxY + 26);
      doc.text(`Client Name: ${booking.client?.user?.name || 'Traveler'}`, 46, boxY + 39);
      doc.text(`Email: ${booking.client?.user?.email || 'N/A'}`, 46, boxY + 52);
      doc.text(`Phone: ${booking.client?.user?.phone || 'N/A'}`, 46, boxY + 65);
      doc.text(`Referring Agent: ${booking.agent?.user?.name ? `${booking.agent.user.name} (${booking.agent.referral_code})` : 'Direct Booking'}`, 46, boxY + 78);

      // Right Box: Tour & Schedule
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#44403C').text('EXPEDITION & SCHEDULE INFORMATION', 308, boxY + 8);
      doc.moveTo(308, boxY + 20).lineTo(548, boxY + 20).strokeColor('#E7E5E4').stroke();

      doc.font('Helvetica').fontSize(8).fillColor('#1C1917');
      doc.text(`Destination: ${booking.destination?.title || 'Ethiopian Tour'}`, 308, boxY + 26, { width: 240, lineBreak: false });
      doc.text(`Region: ${booking.destination?.region || 'Ethiopia'}`, 308, boxY + 39);
      doc.text(`Duration: ${booking.destination?.duration_days || 3} Days`, 308, boxY + 52);
      doc.text(`Scheduled Travel Date: ${booking.travel_date}`, 308, boxY + 65);
      doc.text(`Travelers Count: ${booking.travelers} Persons`, 308, boxY + 78);

      // 4. Financial Table (Detailed Table in One Page)
      const tableY = 244;
      doc.rect(36, tableY, 523, 22).fill(primaryColor);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.text('FINANCIAL ITEM / SETTLEMENT BREAKDOWN', 46, tableY + 7);
      doc.text('RATE / TIMELINE TIER', 290, tableY + 7);
      doc.text('AMOUNT (ETB)', 445, tableY + 7, { align: 'right', width: 100 });

      let curY = tableY + 22;

      let rows: string[][];
      if (isCancelled) {
        rows = [
          ['Original Confirmed Booking Payment', '100% of Booking', `${Number(booking.total_price).toFixed(2)} ETB`],
          [`Cancellation Timeline Tier (${calc.diffDays} Days Elapsed)`, calc.tierDescription, 'Timeline Verified'],
          [`Cancellation Penalty Deduction (${calc.penaltyPercentage}%)`, `${calc.penaltyPercentage}.00% Policy Rate`, `${penaltyFee.toFixed(2)} ETB`],
          [
            'Agent Referral Commission from Penalty',
            booking.agent_id ? `${calc.penaltyPercentage}.00% of Penalty` : 'Direct Booking (No Agent)',
            booking.agent_id ? `${calc.agentCommission.toFixed(2)} ETB` : '0.00 ETB',
          ],
          [
            'Agency Escrow Retained Penalty Balance',
            booking.agent_id ? `${(100 - calc.penaltyPercentage).toFixed(2)}% of Penalty` : '100.00% of Penalty',
            `${calc.agencyRetained.toFixed(2)} ETB`,
          ],
        ];
      } else {
        rows = [
          [`${booking.destination?.title || 'Tour Package'} (${booking.travelers} Travelers)`, `${Number(booking.unit_price).toFixed(2)} ETB / traveler`, `${Number(booking.total_price).toFixed(2)} ETB`],
          ['Licensed Historical Guide & Local Scout Accompany', 'Included in Package', '0.00 ETB'],
          ['All National Park / UNESCO Monument Permits', 'Included in Package', '0.00 ETB'],
          ['Private AC Minivan / 4WD Ground Transportation', 'Included in Package', '0.00 ETB'],
          ['Escrow Audit-Verified Price Guarantee', '100% Escrow Protection', 'Confirmed'],
        ];
      }

      rows.forEach((r, idx) => {
        if (idx % 2 === 1) {
          doc.rect(36, curY, 523, 19).fill('#F5F5F4');
        }
        doc.font('Helvetica').fontSize(8).fillColor('#1C1917');
        doc.text(r[0], 46, curY + 5, { width: 240, lineBreak: false });
        doc.text(r[1], 290, curY + 5, { width: 150 });
        doc.font('Helvetica-Bold').text(r[2], 445, curY + 5, { align: 'right', width: 100 });
        curY += 19;
        doc.moveTo(36, curY).lineTo(559, curY).strokeColor('#E7E5E4').stroke();
      });

      // Net Summary Banner
      curY += 6;
      doc.rect(36, curY, 523, 26).fill(isCancelled ? '#FEF2F2' : '#ECFDF5');
      doc.rect(36, curY, 523, 26).strokeColor(isCancelled ? '#FCA5A5' : '#A7F3D0').stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(isCancelled ? '#991B1B' : '#065F46');
      doc.text(
        isCancelled ? 'NET REFUND TO CLIENT (ESCROW DISBURSED):' : 'TOTAL CONFIRMED EXPEDITION PAYMENT:',
        46, curY + 8
      );
      doc.text(
        isCancelled ? `${refundAmount.toFixed(2)} ETB` : `${Number(booking.total_price).toFixed(2)} ETB`,
        425, curY + 8, { align: 'right', width: 120 }
      );

      curY += 34;

      // 5. Official Governance & Policy Box
      doc.rect(36, curY, 523, 86).strokeColor('#E7E5E4').stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#44403C').text('OFFICIAL GOVERNANCE & POLICY TERMS', 46, curY + 7);
      doc.moveTo(46, curY + 18).lineTo(548, curY + 18).strokeColor('#E7E5E4').stroke();

      doc.font('Helvetica').fontSize(7.5).fillColor('#57534E');
      if (isCancelled) {
        doc.text(
          `1. Cancellation Reason Recorded: "${booking.manager_comment || 'Client requested cancellation'}"`,
          46, curY + 24, { width: 500, lineGap: 1.5 }
        );
        doc.text(
          `2. Tiered Penalty Governance: Cancellations within 1-5 days incur 2% penalty, 6-10 days incur 4% penalty, and 10 days and above incur 8% penalty. The client may cancel up until the travel day presents.`,
          46, curY + 38, { width: 500, lineGap: 1.5 }
        );
        doc.text(
          `3. Commission Governance: The referring agent receives commission from the booking/cancellation penalty (${calc.penaltyPercentage}%) only if the traveler was referenced by an authorized agent. Direct travelers incur zero commission deductions. Managers receive no commissions.`,
          46, curY + 54, { width: 500, lineGap: 1.5 }
        );
        doc.text(
          `4. Settlement: The net refund of ${refundAmount.toFixed(2)} ETB is processed directly to the client's original payment method via escrow ledger reconciliation.`,
          46, curY + 70, { width: 500, lineGap: 1.5 }
        );
      } else {
        doc.text(
          '1. Departure Instructions: Please assemble at the designated airport/hotel rendezvous in Bahir Dar or regional hub. Certified master guides will welcome you with ASK Tours credentials.',
          46, curY + 24, { width: 500, lineGap: 1.5 }
        );
        doc.text(
          '2. Cancellation Protection: You may cancel your reservation up until your travel day presents. Tiered cancellation penalties apply: 1-5 days (2%), 6-10 days (4%), 10+ days (8%).',
          46, curY + 44, { width: 500, lineGap: 1.5 }
        );
        doc.text(
          '3. Escrow Security Guarantee: All traveler payments remain secured in escrow until expedition departure, guaranteeing accommodation and transport availability.',
          46, curY + 64, { width: 500, lineGap: 1.5 }
        );
      }

      curY += 94;

      // 6. Signatures / Seals Box
      doc.rect(36, curY, 255, 54).strokeColor('#E7E5E4').stroke();
      doc.rect(298, curY, 261, 54).strokeColor('#E7E5E4').stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#44403C').text('OFFICIAL ISSUING AUTHORITY', 46, curY + 7);
      doc.font('Helvetica').fontSize(7).fillColor('#78716C').text('ASK Tours Operations Dispatch & Escrow Audit', 46, curY + 18);
      doc.text('Certified Ethiopian Tourism Board Operator #BD-2026-ET', 46, curY + 28);
      doc.text('Digitally Signed & Validated via PostgreSQL Audit Log', 46, curY + 38);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#44403C').text('DOCUMENT VERIFICATION', 308, curY + 7);
      doc.font('Helvetica').fontSize(7).fillColor('#78716C').text(`Verification Ref: TX-${booking.id.substring(0, 12).toUpperCase()}`, 308, curY + 18);
      doc.text(`Generated on: ${new Date().toUTCString()}`, 308, curY + 28);
      doc.text(`Issuance Mark: ${documentMark} (Download #${currentDownloads + 1})`, 308, curY + 38);

      // 7. Footer line
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#A8A29E').text(
        'This is an official single-page electronic document generated by ASK Tour & Travel Agency Management System v2.0.',
        36, 792, { align: 'center', width: 523 }
      );

      doc.end();
    });
  }
}
