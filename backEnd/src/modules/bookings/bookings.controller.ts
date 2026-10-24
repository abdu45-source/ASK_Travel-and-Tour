import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission, PermissionScope } from '../../common/enums/permissions.enum';
import { BookingStatus } from '../../common/enums/domain.enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  @RequirePermission(Permission.BOOKING_READ)
  async getBookings(
    @Query('status') status?: BookingStatus,
    @Query('destinationId') destinationId?: string,
    @Query('agentId') agentId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @CurrentUser('id') userId?: string,
    @Req() req?: any,
  ) {
    const scope = req?.userPermissionScope as PermissionScope;
    return this.bookingsService.findAll({
      status,
      destinationId,
      agentId,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      scope,
      currentUserId: userId,
    });
  }

  @Post()
  @RequirePermission(Permission.BOOKING_CREATE)
  async createBooking(
    @Body()
    body: {
      destination_id: string;
      travel_date: string;
      travelers: number;
      client_notes?: string;
      referral_code?: string;
      booking_via_agent?: boolean;
    },
    @CurrentUser('id') clientId: string,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    return this.bookingsService.createBooking(
      clientId,
      { ...body, idempotency_key: idempotencyKey },
      clientId,
    );
  }

  @Get(':id/cancel-preview')
  @RequirePermission(Permission.BOOKING_READ)
  async getCancelPreview(@Param('id') id: string) {
    return this.bookingsService.getCancelPreview(id);
  }

  @Post(':id/approve')
  @RequirePermission(Permission.BOOKING_APPROVE)
  async approveBooking(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.bookingsService.approveBooking(id, managerId, comment);
  }

  @Post(':id/reject')
  @RequirePermission(Permission.BOOKING_REJECT)
  async rejectBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.bookingsService.rejectBooking(id, managerId, reason);
  }

  @Post(':id/comment')
  @RequirePermission(Permission.BOOKING_COMMENT)
  async addComment(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.bookingsService.addComment(id, managerId, comment);
  }

  @Post(':id/cancel')
  @RequirePermission(Permission.BOOKING_CANCEL)
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.bookingsService.cancelBooking(id, actorId, reason);
  }

  @Post(':id/complete')
  @RequirePermission(Permission.BOOKING_COMPLETE)
  async completeBooking(
    @Param('id') id: string,
    @CurrentUser('id') managerId: string,
  ) {
    return this.bookingsService.completeBooking(id, managerId);
  }

  @Get(':id/pdf')
  @RequirePermission(Permission.BOOKING_READ)
  async getBookingPdf(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.bookingsService.generateBookingPdf(id, userId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id')
  @RequirePermission(Permission.BOOKING_READ)
  async getBooking(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }
}
