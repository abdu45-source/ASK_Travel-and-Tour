import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardsController {
  constructor(private dashboardsService: DashboardsService) {}

  @Get('owner')
  @RequirePermission(Permission.DASHBOARD_READ)
  async getOwnerDashboard() {
    return this.dashboardsService.getOwnerDashboard();
  }

  @Get('owner/analytics')
  @RequirePermission(Permission.DASHBOARD_READ)
  async getOwnerAnalytics(
    @Query('period') period?: 'day' | 'week' | 'month' | 'year' | 'all',
    @Query('status') status?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardsService.getOwnerAnalytics({
      period,
      status,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('manager')
  @RequirePermission(Permission.DASHBOARD_READ)
  async getManagerDashboard(@CurrentUser('id') managerId: string) {
    return this.dashboardsService.getManagerDashboard(managerId);
  }

  @Get('agent')
  @RequirePermission(Permission.DASHBOARD_READ)
  async getAgentDashboard(@CurrentUser('id') agentUserId: string) {
    return this.dashboardsService.getAgentDashboard(agentUserId);
  }

  @Get('client')
  @RequirePermission(Permission.DASHBOARD_READ)
  async getClientDashboard(@CurrentUser('id') clientUserId: string) {
    return this.dashboardsService.getClientDashboard(clientUserId);
  }
}
