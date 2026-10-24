import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceRule } from '../../entities/price-rule.entity';
import { Destination } from '../../entities/destination.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PriceRule, Destination])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
