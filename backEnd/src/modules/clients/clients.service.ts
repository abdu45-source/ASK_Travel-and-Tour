import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Client } from '../../entities/client.entity';
import { User } from '../../entities/user.entity';
import { Agent } from '../../entities/agent.entity';
import { UserStatus } from '../../common/enums/domain.enums';
import { PermissionScope } from '../../common/enums/permissions.enum';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    private rbacService: RbacService,
    private auditService: AuditService,
  ) {}

  async findAll(params: {
    search?: string;
    scope?: PermissionScope;
    currentUserId?: string;
  }) {
    const query = this.clientRepo
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.user', 'user')
      .leftJoinAndSelect('client.referredByAgent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .leftJoinAndSelect('client.bookings', 'bookings');

    // Scoping check (ABAC query filter)
    if (params.scope === PermissionScope.ASSIGNED || params.scope === PermissionScope.OWN) {
      const agent = await this.agentRepo.findOne({
        where: { user_id: params.currentUserId },
      });
      if (agent) {
        query.andWhere('client.referred_by_agent_id = :agentId', { agentId: agent.id });
      } else {
        query.andWhere('client.user_id = :userId', { userId: params.currentUserId });
      }
    }

    if (params.search) {
      query.andWhere(
        '(LOWER(user.name) LIKE LOWER(:s) OR LOWER(user.email) LIKE LOWER(:s) OR user.phone LIKE :s)',
        { s: `%${params.search}%` },
      );
    }

    query.orderBy('client.created_at', 'DESC');
    return query.getMany();
  }

  async registerAssisted(
    data: { name: string; email: string; phone?: string },
    agentUserId: string,
  ) {
    const existing = await this.userRepo.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const agent = await this.agentRepo.findOne({
      where: { user_id: agentUserId },
    });

    const tempPassword = 'Client@' + Math.floor(1000 + Math.random() * 9000);
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const user = this.userRepo.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone,
      password_hash,
      status: UserStatus.ACTIVE,
      email_verified_at: new Date(),
    });
    const savedUser = await this.userRepo.save(user);

    const client = this.clientRepo.create({
      user_id: savedUser.id,
      referred_by_agent_id: agent ? agent.id : null,
      referral_code_used: agent ? agent.referral_code : null,
      onboarding_status: 'ACTIVE',
    });
    await this.clientRepo.save(client);

    await this.rbacService.assignRoleToUser(savedUser.id, 'CLIENT', agentUserId);

    await this.auditService.log({
      actorId: agentUserId,
      action: 'AGENT_ASSISTED_CLIENT_REGISTER',
      entityType: 'Client',
      entityId: savedUser.id,
      after: { name: savedUser.name, email: savedUser.email },
    });

    return {
      client: await this.clientRepo.findOne({
        where: { user_id: savedUser.id },
        relations: ['user', 'referredByAgent'],
      }),
      temporaryPassword: tempPassword,
    };
  }
}
