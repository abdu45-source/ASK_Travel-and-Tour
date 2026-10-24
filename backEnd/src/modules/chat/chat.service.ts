import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { User } from '../../entities/user.entity';
import { Client } from '../../entities/client.entity';
import { Agent } from '../../entities/agent.entity';
import { ConversationType } from '../../common/enums/domain.enums';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private msgRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
  ) {}

  async getUserConversations(userId: string) {
    const convs = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.messages', 'm')
      .where('c.participant_ids @> :userJson', { userJson: JSON.stringify([userId]) })
      .orderBy('c.updated_at', 'DESC')
      .getMany();

    // Fetch participant user details
    const result = [];
    for (const c of convs) {
      const otherParticipantIds = (c.participant_ids || []).filter((id) => id !== userId);
      const otherUsers = otherParticipantIds.length > 0
        ? await this.userRepo.createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: otherParticipantIds })
            .select(['u.id', 'u.name', 'u.email'])
            .getMany()
        : [];

      const lastMessage = c.messages?.length
        ? c.messages.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]
        : null;

      result.push({
        id: c.id,
        type: c.type,
        status: c.status,
        participants: otherUsers,
        lastMessage,
        updated_at: c.updated_at,
      });
    }

    return result;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conv.participant_ids.includes(userId)) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const [items, total] = await this.msgRepo.findAndCount({
      where: { conversation_id: conversationId },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    clientMsgId?: string,
  ): Promise<Message> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conv.participant_ids.includes(senderId)) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const message = this.msgRepo.create({
      conversation_id: conversationId,
      sender_id: senderId,
      body: body.trim(),
      client_msg_id: clientMsgId,
    });
    const saved = await this.msgRepo.save(message);

    conv.updated_at = new Date();
    await this.convRepo.save(conv);

    return this.msgRepo.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });
  }

  async getOrCreateClientSupportConversation(clientId: string): Promise<Conversation> {
    const client = await this.clientRepo.findOne({
      where: { user_id: clientId },
      relations: ['referredByAgent', 'referredByAgent.user'],
    });

    let targetStaffId: string | null = null;
    if (client?.referredByAgent?.user_id) {
      targetStaffId = client.referredByAgent.user_id;
    } else {
      // Find a manager
      const manager = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.userRoles', 'ur')
        .innerJoin('ur.role', 'r')
        .where('r.role_name = :role', { role: 'MANAGER' })
        .getOne();
      targetStaffId = manager ? manager.id : null;
    }

    const participantIds = [clientId];
    if (targetStaffId) participantIds.push(targetStaffId);

    // Look for existing conversation
    let conv = await this.convRepo
      .createQueryBuilder('c')
      .where('c.type = :type', { type: ConversationType.CLIENT_SUPPORT })
      .andWhere('c.participant_ids @> :clientJson', { clientJson: JSON.stringify([clientId]) })
      .getOne();

    if (!conv) {
      conv = this.convRepo.create({
        type: ConversationType.CLIENT_SUPPORT,
        participant_ids: participantIds,
        status: 'ACTIVE',
      });
      conv = await this.convRepo.save(conv);
    }

    const otherId = conv.participant_ids.find((id) => id !== clientId);
    let counterpart: any = null;
    if (otherId) {
      counterpart = await this.userRepo.findOne({
        where: { id: otherId },
        select: ['id', 'name', 'email', 'phone'],
        relations: ['userRoles', 'userRoles.role'],
      });
    }

    return {
      ...conv,
      counterpart: counterpart
        ? {
            id: counterpart.id,
            name: counterpart.name,
            email: counterpart.email,
            phone: counterpart.phone,
            role: counterpart.userRoles?.[0]?.role?.role_name || (client?.referredByAgent ? 'AGENT' : 'MANAGER'),
          }
        : null,
    } as any;
  }

  async getOrCreateAgentManagerConversation(agentUserId: string): Promise<Conversation> {
    const agent = await this.agentRepo.findOne({ where: { user_id: agentUserId } });
    let managerUserId = agent?.manager_id;

    if (!managerUserId) {
      const manager = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.userRoles', 'ur')
        .innerJoin('ur.role', 'r')
        .where('r.role_name = :role', { role: 'MANAGER' })
        .getOne();
      managerUserId = manager?.id;
    }

    const participantIds = [agentUserId];
    if (managerUserId) participantIds.push(managerUserId);

    let conv = await this.convRepo
      .createQueryBuilder('c')
      .where('c.type = :type', { type: ConversationType.AGENT_MANAGER })
      .andWhere('c.participant_ids @> :agentJson', { agentJson: JSON.stringify([agentUserId]) })
      .getOne();

    if (!conv) {
      conv = this.convRepo.create({
        type: ConversationType.AGENT_MANAGER,
        participant_ids: participantIds,
        status: 'ACTIVE',
      });
      conv = await this.convRepo.save(conv);
    }

    const otherId = conv.participant_ids.find((id) => id !== agentUserId);
    let counterpart: any = null;
    if (otherId) {
      counterpart = await this.userRepo.findOne({
        where: { id: otherId },
        select: ['id', 'name', 'email', 'phone'],
      });
    }

    return {
      ...conv,
      counterpart: counterpart
        ? {
            id: counterpart.id,
            name: counterpart.name,
            email: counterpart.email,
            phone: counterpart.phone,
            role: 'MANAGER',
          }
        : null,
    } as any;
  }
}
