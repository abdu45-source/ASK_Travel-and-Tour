import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { UserStatus } from '../../common/enums/domain.enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermission(Permission.USER_READ)
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('role') role?: string,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      role,
      status,
      search,
    });
  }

  @Post('managers')
  @RequirePermission(Permission.MANAGER_CREATE)
  async createManager(
    @Body() body: { name: string; email: string; phone?: string; password?: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.createManager(body, actorId);
  }

  @Post('managers/:id/suspend')
  @RequirePermission(Permission.MANAGER_SUSPEND)
  async suspendManager(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.setManagerStatus(id, UserStatus.SUSPENDED, actorId);
  }

  @Post('managers/:id/revoke')
  @RequirePermission(Permission.MANAGER_REVOKE)
  async revokeManager(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.setManagerStatus(id, UserStatus.REVOKED, actorId);
  }

  @Post('managers/:id/activate')
  @RequirePermission(Permission.MANAGER_ASSIGN)
  async activateManager(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.setManagerStatus(id, UserStatus.ACTIVE, actorId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; phone?: string; currentPassword?: string; newPassword?: string },
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Get(':id')
  @RequirePermission(Permission.USER_READ)
  async getUser(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
