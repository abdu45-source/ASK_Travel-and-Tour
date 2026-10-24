import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../entities/booking.entity';
import { Destination } from '../../entities/destination.entity';
import { Agent } from '../../entities/agent.entity';
import { Client } from '../../entities/client.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { BookingStatus, WalletTxType } from '../../common/enums/domain.enums';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(Destination)
    private destRepo: Repository<Destination>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async getOwnerDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Revenue
    const revenueApproved = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.total_price)', 'total')
      .where('b.status IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.COMPLETED],
      })
      .getRawOne();
    const totalRevenue = parseFloat(revenueApproved?.total || '0');

    // Penalties collected
    const penalties = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.penalty_fee)', 'total')
      .where('b.status = :status', { status: BookingStatus.CANCELLED })
      .getRawOne();
    const totalPenalties = parseFloat(penalties?.total || '0');

    // Commission liability (all agent current wallet balances)
    const liability = await this.agentRepo
      .createQueryBuilder('a')
      .select('SUM(a.wallet_balance)', 'total')
      .getRawOne();
    const commissionLiability = parseFloat(liability?.total || '0');

    // Bookings count by status
    const statusCounts = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.status')
      .getRawMany();

    const bookingsByStatus: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    statusCounts.forEach((sc) => {
      bookingsByStatus[sc.status] = parseInt(sc.count, 10);
    });

    // Top destinations
    const topDestinations = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.destination', 'd')
      .select('d.id', 'id')
      .addSelect('d.title', 'title')
      .addSelect('d.region', 'region')
      .addSelect('COUNT(b.id)', 'bookingCount')
      .addSelect('SUM(b.total_price)', 'totalRevenue')
      .where('b.status IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.COMPLETED],
      })
      .groupBy('d.id')
      .addGroupBy('d.title')
      .addGroupBy('d.region')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(5)
      .getRawMany();

    // Agent leaderboard
    const agentLeaderboard = await this.agentRepo
      .createQueryBuilder('a')
      .innerJoin('a.user', 'u')
      .leftJoin('a.clients', 'c')
      .select('a.id', 'agentId')
      .addSelect('u.name', 'agentName')
      .addSelect('a.referral_code', 'referralCode')
      .addSelect('a.wallet_balance', 'walletBalance')
      .addSelect('COUNT(c.user_id)', 'clientCount')
      .groupBy('a.id')
      .addGroupBy('u.name')
      .orderBy('"clientCount"', 'DESC')
      .limit(5)
      .getRawMany();

    // Total counts
    const totalAgents = await this.agentRepo.count();
    const totalClients = await this.clientRepo.count();
    const totalBookings = await this.bookingRepo.count();

    return {
      totalRevenue,
      totalPenalties,
      commissionLiability,
      bookingsByStatus,
      topDestinations,
      agentLeaderboard,
      metrics: {
        totalAgents,
        totalClients,
        totalBookings,
      },
    };
  }

  async getManagerDashboard(managerUserId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pending moderation queue
    const pendingBookings = await this.bookingRepo.find({
      where: { status: BookingStatus.PENDING },
      relations: ['destination', 'client', 'client.user', 'agent', 'agent.user'],
      order: { created_at: 'ASC' },
      take: 10,
    });
    const pendingCount = await this.bookingRepo.count({
      where: { status: BookingStatus.PENDING },
    });

    // New clients registered today
    const newClientsToday = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.created_at >= :today', { today })
      .getCount();

    // Daily sales today
    const salesTodayRaw = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.total_price)', 'total')
      .where('b.status IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.COMPLETED],
      })
      .andWhere('b.created_at >= :today', { today })
      .getRawOne();
    const salesToday = parseFloat(salesTodayRaw?.total || '0');

    // Agents overview
    const agents = await this.agentRepo.find({
      relations: ['user', 'clients'],
      order: { created_at: 'DESC' },
      take: 10,
    });

    return {
      pendingQueueSize: pendingCount,
      pendingBookings,
      newClientsToday,
      salesToday,
      agents,
    };
  }

  async getAgentDashboard(agentUserId: string) {
    const agent = await this.agentRepo.findOne({
      where: { user_id: agentUserId },
      relations: ['user'],
    });

    if (!agent) {
      return { message: 'Agent profile not found' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FR-AGT / SRS 6.2: Daily Registered, Pending Approval, Rejected
    const dailyRegistered = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.referred_by_agent_id = :agentId', { agentId: agent.id })
      .andWhere('c.created_at >= :today', { today })
      .getCount();

    const pendingApproval = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.agent_id = :agentId', { agentId: agent.id })
      .andWhere('b.status = :status', { status: BookingStatus.PENDING })
      .getCount();

    const rejected = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.agent_id = :agentId', { agentId: agent.id })
      .andWhere('b.status = :status', { status: BookingStatus.REJECTED })
      .getCount();

    const approved = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.agent_id = :agentId', { agentId: agent.id })
      .andWhere('b.status = :status', { status: BookingStatus.APPROVED })
      .getCount();

    const totalClients = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.referred_by_agent_id = :agentId', { agentId: agent.id })
      .getCount();

    // Recent clients
    const clients = await this.clientRepo.find({
      where: { referred_by_agent_id: agent.id },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    // Recent transactions
    const recentTransactions = await this.txRepo.find({
      where: { agent_id: agent.id },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return {
      referralCode: agent.referral_code,
      walletBalance: Number(agent.wallet_balance),
      dailyRegistered,
      pendingApproval,
      rejected,
      approved,
      totalClients,
      recentClients: clients,
      recentTransactions,
    };
  }

  async getClientDashboard(clientUserId: string) {
    const bookings = await this.bookingRepo.find({
      where: { client_id: clientUserId },
      relations: ['destination', 'statusHistory'],
      order: { travel_date: 'ASC' },
    });

    const upcomingTrips = bookings.filter(
      (b) =>
        b.status === BookingStatus.APPROVED &&
        new Date(b.travel_date) >= new Date(new Date().setHours(0, 0, 0, 0)),
    );

    const pendingRequests = bookings.filter((b) => b.status === BookingStatus.PENDING);
    const pastTrips = bookings.filter(
      (b) =>
        b.status === BookingStatus.COMPLETED ||
        (b.status === BookingStatus.APPROVED &&
          new Date(b.travel_date) < new Date(new Date().setHours(0, 0, 0, 0))),
    );

    const cancelledTrips = bookings.filter((b) => b.status === BookingStatus.CANCELLED);

    // Identify dedicated staff contact: Assigned Partner Agent or Agency Operations Manager
    const client = await this.clientRepo.findOne({
      where: { user_id: clientUserId },
      relations: ['referredByAgent', 'referredByAgent.user'],
    });

    let assignedStaff: {
      role: 'AGENT' | 'MANAGER';
      name: string;
      email: string;
      phone: string;
      referralCode?: string;
    };

    if (client?.referredByAgent?.user) {
      assignedStaff = {
        role: 'AGENT',
        name: client.referredByAgent.user.name || 'Dawit Haile (Travel Agent)',
        email: client.referredByAgent.user.email || 'agent@askdigital.et',
        phone: client.referredByAgent.user.phone || '+251933445566',
        referralCode: client.referredByAgent.referral_code,
      };
    } else {
      const manager = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.userRoles', 'ur')
        .innerJoin('ur.role', 'r')
        .where('r.role_name = :role', { role: 'MANAGER' })
        .getOne();

      assignedStaff = {
        role: 'MANAGER',
        name: manager?.name || 'Selamawit Tadesse (Agency Manager)',
        email: manager?.email || 'manager@askdigital.et',
        phone: manager?.phone || '+251922334455',
      };
    }

    // Recent notifications for the client (approvals, rejections, availability changes)
    const recentNotifications = await this.notifRepo.find({
      where: { user_id: clientUserId },
      order: { created_at: 'DESC' },
      take: 5,
    });

    return {
      upcomingTrips,
      pendingRequests,
      pastTrips,
      cancelledTrips,
      totalBookings: bookings.length,
      assignedStaff,
      recentNotifications,
    };
  }

  async getOwnerAnalytics(filters: {
    period?: 'day' | 'week' | 'month' | 'year' | 'all';
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const period = filters.period || 'all';
    const statusFilter = (filters.status || 'ALL').toUpperCase();
    const now = new Date();

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (filters.startDate) {
      startDate = new Date(filters.startDate);
    } else {
      if (period === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      } else if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (period === 'year') {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
    }

    if (filters.endDate) {
      endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const query = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.destination', 'd')
      .leftJoinAndSelect('b.client', 'c')
      .leftJoinAndSelect('c.user', 'cu')
      .leftJoinAndSelect('b.agent', 'a')
      .leftJoinAndSelect('a.user', 'au')
      .leftJoinAndSelect('b.statusHistory', 'sh')
      .orderBy('b.created_at', 'DESC');

    if (startDate) {
      query.andWhere('b.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('b.created_at <= :endDate', { endDate });
    }
    if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
      query.andWhere('b.total_price >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
      query.andWhere('b.total_price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    const allPeriodBookings = await query.getMany();

    // 1. Calculate Period-Wide Status Counts (Accepted vs Rejected vs Cancelled vs Pending)
    const acceptedCount = allPeriodBookings.filter(
      (b) => b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED,
    ).length;
    const rejectedCount = allPeriodBookings.filter(
      (b) => b.status === BookingStatus.REJECTED,
    ).length;
    const cancelledCount = allPeriodBookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    ).length;
    const pendingCount = allPeriodBookings.filter(
      (b) => b.status === BookingStatus.PENDING,
    ).length;
    const totalPeriodBookings = allPeriodBookings.length;
    const decidedCount = acceptedCount + rejectedCount;
    const acceptanceRate = decidedCount > 0 ? Math.round((acceptedCount / decidedCount) * 100) : 100;

    // 2. Filter bookings list according to status filter
    let filteredBookings = allPeriodBookings;
    if (statusFilter === 'APPROVED') {
      filteredBookings = allPeriodBookings.filter(
        (b) => b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED,
      );
    } else if (statusFilter === 'CANCELLED') {
      filteredBookings = allPeriodBookings.filter((b) => b.status === BookingStatus.CANCELLED);
    } else if (statusFilter === 'REJECTED') {
      filteredBookings = allPeriodBookings.filter((b) => b.status === BookingStatus.REJECTED);
    } else if (statusFilter === 'PENDING') {
      filteredBookings = allPeriodBookings.filter((b) => b.status === BookingStatus.PENDING);
    }

    // 3. Financial calculations & commission breakdown per row & overall
    let grossRevenue = 0;
    let totalPenalties = 0;
    let totalRefunds = 0;
    let totalAgentCommissions = 0;

    const items = filteredBookings.map((b) => {
      const totalPrice = Number(b.total_price) || 0;
      const penaltyFee = Number(b.penalty_fee) || 0;
      const refundAmount = Number(b.refund_amount) || 0;

      // Determine penalty rate used (2%, 4%, or 8%)
      let penaltyRate = 0.02;
      let penaltyPercentage = 2;
      if (penaltyFee > 0 && totalPrice > 0) {
        const ratio = penaltyFee / totalPrice;
        if (ratio >= 0.07) {
          penaltyRate = 0.08;
          penaltyPercentage = 8;
        } else if (ratio >= 0.035) {
          penaltyRate = 0.04;
          penaltyPercentage = 4;
        } else {
          penaltyRate = 0.02;
          penaltyPercentage = 2;
        }
      }

      // Advisor rule 2: Manager does NOT have commissions.
      // ONLY referring agent receives commission if client was referenced by that agent.
      let agentCommission = 0;
      let agencyRetained = 0;

      if (b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED) {
        grossRevenue += totalPrice;

        // Agent 10% commission if booked via partner agent
        if (b.agent_id) {
          agentCommission = Math.round(totalPrice * 0.1 * 100) / 100;
          totalAgentCommissions += agentCommission;
        }
        agencyRetained = Math.round((totalPrice - agentCommission) * 100) / 100;
      } else if (b.status === BookingStatus.CANCELLED) {
        totalPenalties += penaltyFee;
        totalRefunds += refundAmount;

        // Agent penalty commission: penalty amount * penalty rate (only if referred by agent)
        if (b.agent_id) {
          agentCommission = Math.round(penaltyFee * penaltyRate * 100) / 100;
          totalAgentCommissions += agentCommission;
        }
        agencyRetained = Math.round((penaltyFee - agentCommission) * 100) / 100;
      }

      return {
        id: b.id,
        bookingRef: b.id.substring(0, 8).toUpperCase(),
        destinationTitle: b.destination?.title || 'Tour Circuit',
        destinationRegion: b.destination?.region || 'Ethiopia',
        destinationImage: b.destination?.gallery_images?.[0] || null,
        clientName: b.client?.user?.name || 'Direct Client',
        clientEmail: b.client?.user?.email || 'N/A',
        clientPhone: b.client?.user?.phone || 'N/A',
        agentName: b.agent?.user?.name || null,
        agentReferralCode: b.agent?.referral_code || null,
        status: b.status,
        travelDate: b.travel_date,
        travelers: b.travelers,
        totalPrice,
        penaltyFee,
        penaltyRate,
        penaltyPercentage,
        refundAmount,
        managerCommission: 0,
        agentCommission,
        agencyRetained,
        managerComment: b.manager_comment,
        createdAt: b.created_at,
        approvedAt: b.approved_at,
        cancelledAt: b.cancelled_at,
      };
    });

    // Advisor rule 5: Amounts cannot be negative.
    // Net agency earnings: Gross revenue retained from approved bookings + retained penalties from cancelled bookings minus agent referral commissions paid out.
    const agencyNetRetained = Math.max(
      0,
      Math.round((grossRevenue + totalPenalties - totalAgentCommissions) * 100) / 100,
    );

    // 4. Generate Time Series Trend Points for Analytics Graph
    const trendMap: Record<string, {
      date: string;
      accepted: number;
      rejected: number;
      cancelled: number;
      pending: number;
      revenue: number;
      agentCommission: number;
    }> = {};

    for (const b of allPeriodBookings) {
      const d = new Date(b.created_at);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = {
          date: dateKey,
          accepted: 0,
          rejected: 0,
          cancelled: 0,
          pending: 0,
          revenue: 0,
          agentCommission: 0,
        };
      }

      const p = trendMap[dateKey];
      const price = Number(b.total_price) || 0;
      const penalty = Number(b.penalty_fee) || 0;

      if (b.status === BookingStatus.APPROVED || b.status === BookingStatus.COMPLETED) {
        p.accepted += 1;
        p.revenue += price;
        if (b.agent_id) p.agentCommission += Math.round(price * 0.10 * 100) / 100;
      } else if (b.status === BookingStatus.REJECTED) {
        p.rejected += 1;
      } else if (b.status === BookingStatus.CANCELLED) {
        p.cancelled += 1;
        p.revenue += penalty;
        const rate = (penalty > 0 && price > 0 && penalty / price >= 0.07) ? 0.08 : (penalty / price >= 0.035 ? 0.04 : 0.02);
        if (b.agent_id) p.agentCommission += Math.round(penalty * rate * 100) / 100;
      } else if (b.status === BookingStatus.PENDING) {
        p.pending += 1;
      }
    }

    const trends = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      period,
      statusFilter,
      filterCounts: {
        totalPeriodBookings,
        acceptedCount,
        rejectedCount,
        cancelledCount,
        pendingCount,
        acceptanceRate,
        filteredCount: items.length,
      },
      financials: {
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalPenalties: Math.round(totalPenalties * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        totalManagerCommissions: 0,
        totalAgentCommissions: Math.round(totalAgentCommissions * 100) / 100,
        agencyNetRetained,
      },
      trends,
      items,
    };
  }
}
