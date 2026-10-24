import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { RefreshSession } from '../../entities/refresh-session.entity';
import { UserStatus } from '../../common/enums/domain.enums';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshSession)
    private refreshRepo: Repository<RefreshSession>,
    private rbacService: RbacService,
    private auditService: AuditService,
  ) {}

  async createManager(
    data: { name: string; email: string; phone?: string; password?: string },
    actorId?: string,
  ) {
    const existing = await this.userRepo.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const initialPassword = data.password || 'Manager@2026!';
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

    // Assign MANAGER role
    await this.rbacService.assignRoleToUser(savedUser.id, 'MANAGER', actorId);

    await this.auditService.log({
      actorId,
      action: 'MANAGER_CREATED',
      entityType: 'User',
      entityId: savedUser.id,
      after: { name: savedUser.name, email: savedUser.email },
    });

    return this.findOne(savedUser.id);
  }

  async setManagerStatus(
    userId: string,
    status: UserStatus.SUSPENDED | UserStatus.REVOKED | UserStatus.ACTIVE,
    actorId?: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeStatus = user.status;
    user.status = status;
    await this.userRepo.save(user);

    // Immediate session invalidation for suspended or revoked users
    if (status === UserStatus.SUSPENDED || status === UserStatus.REVOKED) {
      await this.refreshRepo.update({ user_id: userId }, { revoked_at: new Date() });
    }

    await this.auditService.log({
      actorId,
      action: `MANAGER_STATUS_${status}`,
      entityType: 'User',
      entityId: userId,
      before: { status: beforeStatus },
      after: { status },
    });

    return user;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: string;
    status?: UserStatus;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const query = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('user.agentProfile', 'agentProfile')
      .leftJoinAndSelect('user.clientProfile', 'clientProfile');

    if (params.status) {
      query.andWhere('user.status = :status', { status: params.status });
    }

    if (params.role) {
      query.andWhere('role.role_name = :role', { role: params.role });
    }

    if (params.search) {
      query.andWhere(
        '(LOWER(user.name) LIKE LOWER(:s) OR LOWER(user.email) LIKE LOWER(:s) OR user.phone LIKE :s)',
        { s: `%${params.search}%` },
      );
    }

    query.orderBy('user.created_at', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role', 'agentProfile', 'clientProfile'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.name) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException('Current password required to set a new password');
      }
      const match = await bcrypt.compare(data.currentPassword, user.password_hash);
      if (!match) {
        throw new BadRequestException('Current password incorrect');
      }
      user.password_hash = await bcrypt.hash(data.newPassword, 12);
    }

    await this.userRepo.save(user);
    return this.findOne(userId);
  }
}
