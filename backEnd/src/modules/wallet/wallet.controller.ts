import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wallet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @RequirePermission(Permission.WALLET_READ)
  async getMyWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getAgentWallet(userId);
  }

  @Get('transactions')
  @RequirePermission(Permission.WALLET_READ)
  async getTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.walletService.getAllTransactions(parseInt(page, 10), parseInt(limit, 10));
  }

  @Post('payout')
  @RequirePermission(Permission.COMMISSION_PAYOUT_PROCESS)
  async processPayout(
    @Body()
    body: {
      agent_id: string;
      amount: number;
      method: string;
      reference?: string;
    },
    @CurrentUser('id') managerId: string,
  ) {
    return this.walletService.processPayout(body, managerId);
  }
}
