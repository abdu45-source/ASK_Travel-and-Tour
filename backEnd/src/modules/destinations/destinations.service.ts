import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from '../../entities/destination.entity';
import { DestinationStatus } from '../../common/enums/domain.enums';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private destRepo: Repository<Destination>,
    private auditService: AuditService,
  ) {}

  async findAllPublic(params: {
    search?: string;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    duration?: number;
    sort?: 'price_asc' | 'price_desc' | 'popularity' | 'newest';
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);

    const query = this.destRepo
      .createQueryBuilder('dest')
      .leftJoinAndSelect('dest.priceRules', 'priceRules')
      .where('dest.status = :status', { status: DestinationStatus.ACTIVE })
      .andWhere('dest.deleted_at IS NULL');

    if (params.region && params.region !== 'ALL') {
      query.andWhere('dest.region = :region', { region: params.region });
    }

    if (params.search) {
      query.andWhere(
        '(LOWER(dest.title) LIKE LOWER(:s) OR LOWER(dest.region) LIKE LOWER(:s) OR LOWER(dest.description) LIKE LOWER(:s))',
        { s: `%${params.search}%` },
      );
    }

    if (params.minPrice) {
      query.andWhere('dest.base_price >= :minPrice', { minPrice: params.minPrice });
    }

    if (params.maxPrice) {
      query.andWhere('dest.base_price <= :maxPrice', { maxPrice: params.maxPrice });
    }

    if (params.duration) {
      query.andWhere('dest.duration_days = :duration', { duration: params.duration });
    }

    switch (params.sort) {
      case 'price_asc':
        query.orderBy('dest.base_price', 'ASC');
        break;
      case 'price_desc':
        query.orderBy('dest.base_price', 'DESC');
        break;
      case 'popularity':
        query.orderBy('dest.popularity_score', 'DESC');
        break;
      case 'newest':
      default:
        query.orderBy('dest.created_at', 'DESC');
        break;
    }

    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findBySlug(slug: string): Promise<Destination> {
    const dest = await this.destRepo.findOne({
      where: { slug },
      relations: ['priceRules'],
    });
    if (!dest) {
      throw new NotFoundException(`Destination with slug "${slug}" not found`);
    }
    return dest;
  }

  async findOne(id: string): Promise<Destination> {
    const dest = await this.destRepo.findOne({
      where: { id },
      relations: ['priceRules'],
    });
    if (!dest) {
      throw new NotFoundException('Destination not found');
    }
    return dest;
  }

  async findAllAdmin(): Promise<Destination[]> {
    return this.destRepo.find({
      relations: ['priceRules'],
      order: { created_at: 'DESC' },
    });
  }

  async create(data: Partial<Destination>, actorId?: string): Promise<Destination> {
    const slug = data.slug || data.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const existing = await this.destRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Slug "${slug}" already exists`);
    }

    const dest = this.destRepo.create({
      ...data,
      slug,
      created_by: actorId,
      status: data.status || DestinationStatus.ACTIVE,
    });
    const saved = await this.destRepo.save(dest);

    await this.auditService.log({
      actorId,
      action: 'DESTINATION_CREATED',
      entityType: 'Destination',
      entityId: saved.id,
      after: saved,
    });

    return saved;
  }

  async update(id: string, data: Partial<Destination>, actorId?: string): Promise<Destination> {
    const dest = await this.findOne(id);
    const beforeState = { ...dest };

    Object.assign(dest, data);
    const updated = await this.destRepo.save(dest);

    await this.auditService.log({
      actorId,
      action: 'DESTINATION_UPDATED',
      entityType: 'Destination',
      entityId: id,
      before: beforeState,
      after: updated,
    });

    return updated;
  }

  async softDelete(id: string, actorId?: string): Promise<{ success: boolean }> {
    const dest = await this.findOne(id);
    dest.status = DestinationStatus.CANCELLED;
    dest.deleted_at = new Date();
    await this.destRepo.save(dest);

    await this.auditService.log({
      actorId,
      action: 'DESTINATION_SOFT_DELETED',
      entityType: 'Destination',
      entityId: id,
    });

    return { success: true };
  }
}
