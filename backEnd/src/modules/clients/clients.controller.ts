import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission, PermissionScope } from '../../common/enums/permissions.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @RequirePermission(Permission.CLIENT_READ)
  async getClients(
    @Query('search') search?: string,
    @CurrentUser('id') userId?: string,
    @Req() req?: any,
  ) {
    const scope = req?.userPermissionScope as PermissionScope;
    return this.clientsService.findAll({ search, scope, currentUserId: userId });
  }

  @Post()
  @RequirePermission(Permission.CLIENT_REGISTER)
  async registerAssisted(
    @Body() body: { name: string; email: string; phone?: string },
    @CurrentUser('id') agentUserId: string,
  ) {
    return this.clientsService.registerAssisted(body, agentUserId);
  }
}
