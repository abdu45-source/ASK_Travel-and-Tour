import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission, Public } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { Destination } from '../../entities/destination.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('destinations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DestinationsController {
  constructor(private destinationsService: DestinationsService) {}

  @Public()
  @Get()
  async getPublicDestinations(
    @Query('search') search?: string,
    @Query('region') region?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('duration') duration?: string,
    @Query('sort') sort?: 'price_asc' | 'price_desc' | 'popularity' | 'newest',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.destinationsService.findAllPublic({
      search,
      region,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      duration: duration ? parseInt(duration, 10) : undefined,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('admin')
  @RequirePermission(Permission.DESTINATION_CREATE)
  async getAdminDestinations() {
    return this.destinationsService.findAllAdmin();
  }

  @Public()
  @Get(':slug')
  async getDestinationBySlug(@Param('slug') slug: string) {
    return this.destinationsService.findBySlug(slug);
  }

  @Post()
  @RequirePermission(Permission.DESTINATION_CREATE)
  async createDestination(
    @Body() body: Partial<Destination>,
    @CurrentUser('id') actorId: string,
  ) {
    return this.destinationsService.create(body, actorId);
  }

  @Patch(':id')
  @RequirePermission(Permission.DESTINATION_UPDATE)
  async updateDestination(
    @Param('id') id: string,
    @Body() body: Partial<Destination>,
    @CurrentUser('id') actorId: string,
  ) {
    return this.destinationsService.update(id, body, actorId);
  }

  @Delete(':id')
  @RequirePermission(Permission.DESTINATION_DELETE)
  async softDeleteDestination(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.destinationsService.softDelete(id, actorId);
  }
}
