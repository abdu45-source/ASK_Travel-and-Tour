import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission, Public } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { PriceAdjustType } from '../../common/enums/domain.enums';

@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Public()
  @Get('calculate')
  async calculateEffectivePrice(
    @Query('destinationId') destinationId: string,
    @Query('date') date: string,
  ) {
    return this.pricingService.calculateEffectivePrice(destinationId, date);
  }

  @Get('destination/:destId')
  @RequirePermission(Permission.PRICING_MANAGE)
  async getRules(@Param('destId') destId: string) {
    return this.pricingService.getRulesByDestination(destId);
  }

  @Post('destination/:destId')
  @RequirePermission(Permission.PRICING_MANAGE)
  async createRule(
    @Param('destId') destId: string,
    @Body()
    body: {
      name: string;
      start_date: string;
      end_date: string;
      adjust_type: PriceAdjustType;
      value: number;
      priority?: number;
    },
  ) {
    return this.pricingService.createRule(destId, body);
  }

  @Delete(':ruleId')
  @RequirePermission(Permission.PRICING_MANAGE)
  async deleteRule(@Param('ruleId') ruleId: string) {
    return this.pricingService.deleteRule(ruleId);
  }
}
