import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: any;
    after?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      before_state: params.before,
      after_state: params.after,
      ip: params.ip,
      user_agent: params.userAgent,
    });
    return this.auditRepo.save(entry);
  }

  async findAll(limit = 100, page = 1) {
    const [items, total] = await this.auditRepo.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { items, total, page, limit };
  }
}
