import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notifService.getUserNotifications(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notifService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.notifService.markAllAsRead(userId);
  }
}
