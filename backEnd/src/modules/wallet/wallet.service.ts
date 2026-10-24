import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Agent } from '../../entities/agent.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { WalletTxType } from '../../common/enums/domain.enums';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    private auditService: AuditService,
    private dataSource: DataSource,
  ) {}

  async getAgentWallet(agentUserId: string) {
    const agent = await this.agentRepo.findOne({
      where: { user_id: agentUserId },
    });
    if (!agent) {
      throw new NotFoundException('Agent wallet not found');
    }

    const transactions = await this.txRepo.find({
      where: { agent_id: agent.id },
      order: { created_at: 'DESC' },
      relations: ['booking', 'booking.destination'],
    });

    return {
      agentId: agent.id,
      referralCode: agent.referral_code,
      walletBalance: Number(agent.wallet_balance),
      transactions,
    };
  }

  async getAllTransactions(page = 1, limit = 50) {
    const [items, total] = await this.txRepo.findAndCount({
      relations: ['agent', 'agent.user', 'booking', 'booking.destination'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async processPayout(
    data: { agent_id: string; amount: number; method: string; reference?: string },
    managerId: string,
  ) {
    if (data.amount <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero.');
    }

    return this.dataSource.transaction(async (manager) => {
      const agent = await manager
        .getRepository(Agent)
        .createQueryBuilder('agent')
        .setLock('pessimistic_write')
        .where('agent.id = :id', { id: data.agent_id })
        .getOne();

      if (!agent) {
        throw new NotFoundException('Agent not found');
      }

      const currentBalance = Number(agent.wallet_balance);
      if (currentBalance < data.amount) {
        throw new BadRequestException(
          `Insufficient wallet balance (${currentBalance.toFixed(2)} ETB available, requested ${data.amount.toFixed(2)} ETB).`,
        );
      }

      const newBalance = Math.round((currentBalance - data.amount) * 100) / 100;
      agent.wallet_balance = newBalance;
      await manager.getRepository(Agent).save(agent);

      const payoutMethod = data.method || (data as any).payout_method || 'Commercial Bank of Ethiopia';
      const tx = manager.getRepository(WalletTransaction).create({
        agent_id: agent.id,
        type: WalletTxType.PAYOUT,
        amount: -data.amount,
        rate_used: 0,
        balance_after: newBalance,
        reference: `Payout via ${payoutMethod} - Ref: ${data.reference || 'N/A'}`,
        created_by: managerId,
      });
      const savedTx = await manager.getRepository(WalletTransaction).save(tx);

      // Instant notification to agent
      await manager.getRepository(Notification).save(
        manager.getRepository(Notification).create({
          user_id: agent.user_id,
          type: 'COMMISSION_PAID',
          title: 'Payout Processed',
          body: `A payout of ${data.amount.toFixed(2)} ETB has been processed via ${payoutMethod}. Remaining balance: ${newBalance.toFixed(2)} ETB.`,
          ref_type: 'WalletTransaction',
          ref_id: savedTx.id,
        }),
      );

      await this.auditService.log({
        actorId: managerId,
        action: 'PAYOUT_PROCESSED',
        entityType: 'WalletTransaction',
        entityId: savedTx.id,
        after: { agentId: agent.id, amount: data.amount, newBalance },
      });

      return {
        success: true,
        transaction: savedTx,
        newBalance,
      };
    });
  }
}
