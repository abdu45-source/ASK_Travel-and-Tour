import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceRule } from '../../entities/price-rule.entity';
import { Destination } from '../../entities/destination.entity';
import { PriceAdjustType } from '../../common/enums/domain.enums';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceRule)
    private ruleRepo: Repository<PriceRule>,
    @InjectRepository(Destination)
    private destRepo: Repository<Destination>,
  ) {}

  async getRulesByDestination(destinationId: string): Promise<PriceRule[]> {
    return this.ruleRepo.find({
      where: { destination_id: destinationId },
      order: { priority: 'DESC', start_date: 'ASC' },
    });
  }

  async createRule(
    destinationId: string,
    data: {
      name: string;
      start_date: string;
      end_date: string;
      adjust_type: PriceAdjustType;
      value: number;
      priority?: number;
    },
  ): Promise<PriceRule> {
    const dest = await this.destRepo.findOne({ where: { id: destinationId } });
    if (!dest) {
      throw new NotFoundException('Destination not found');
    }

    if (new Date(data.start_date) > new Date(data.end_date)) {
      throw new BadRequestException('start_date must be before end_date');
    }

    const rule = this.ruleRepo.create({
      destination_id: destinationId,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      adjust_type: data.adjust_type,
      value: Number(data.value),
      priority: data.priority || 1,
    });

    return this.ruleRepo.save(rule);
  }

  async deleteRule(ruleId: string): Promise<{ success: boolean }> {
    await this.ruleRepo.delete(ruleId);
    return { success: true };
  }

  async calculateEffectivePrice(
    destinationId: string,
    travelDateStr: string,
  ): Promise<{ effectivePrice: number; appliedRuleId: string | null; appliedRuleName: string | null }> {
    const dest = await this.destRepo.findOne({ where: { id: destinationId } });
    if (!dest) {
      throw new NotFoundException('Destination not found');
    }

    const basePrice = Number(dest.base_price);
    const rules = await this.ruleRepo
      .createQueryBuilder('rule')
      .where('rule.destination_id = :destinationId', { destinationId })
      .andWhere(':travelDate >= rule.start_date AND :travelDate <= rule.end_date', {
        travelDate: travelDateStr,
      })
      .orderBy('rule.priority', 'DESC')
      .getMany();

    if (rules.length === 0) {
      return {
        effectivePrice: Math.round(basePrice * 100) / 100,
        appliedRuleId: null,
        appliedRuleName: null,
      };
    }

    // Highest priority matching rule
    const rule = rules[0];
    let price = basePrice;

    switch (rule.adjust_type) {
      case PriceAdjustType.PERCENT:
        price = basePrice * (1 + Number(rule.value) / 100);
        break;
      case PriceAdjustType.FIXED_AMOUNT:
        price = basePrice + Number(rule.value);
        break;
      case PriceAdjustType.OVERRIDE:
        price = Number(rule.value);
        break;
    }

    price = Math.max(0, Math.round(price * 100) / 100);

    return {
      effectivePrice: price,
      appliedRuleId: rule.id,
      appliedRuleName: rule.name,
    };
  }
}
