import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { BookingStatus } from '../../common/enums/domain.enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily')
  @RequirePermission(Permission.REPORT_READ)
  async getDailyOperationalReport(@Query('date') date?: string) {
    return this.reportsService.getDailyOperationalReport(date);
  }

  @Get('bookings')
  @RequirePermission(Permission.REPORT_READ)
  async getBookingsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: BookingStatus,
    @Query('destinationId') destinationId?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.reportsService.getBookingsReport({
      startDate,
      endDate,
      status,
      destinationId,
      agentId,
    });
  }

  @Get('export/excel')
  @RequirePermission(Permission.REPORT_EXPORT)
  async exportExcel(
    @Query() query: any,
    @CurrentUser('id') actorId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(query, actorId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ASK_Travel_Report_${Date.now()}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('export/pdf')
  @RequirePermission(Permission.REPORT_EXPORT)
  async exportPdf(
    @Query() query: any,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.exportToPdf(
      query,
      user?.name || 'Administrator',
      user?.id,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ASK_Travel_Report_${Date.now()}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
