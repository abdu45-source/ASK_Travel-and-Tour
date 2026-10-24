import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission, PermissionScope } from '../../common/enums/permissions.enum';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get()
  @RequirePermission(Permission.ROLE_READ)
  async getRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('permissions-list')
  @RequirePermission(Permission.ROLE_READ)
  async getPermissionsList() {
    return this.rbacService.getAllPermissionsList();
  }

  @Put(':id/permissions')
  @RequirePermission(Permission.ROLE_MANAGE)
  async updateRolePermissions(
    @Param('id') roleId: string,
    @Body() body: { permissions: { permission: Permission; scope: PermissionScope }[] },
    @Req() req: any,
  ) {
    return this.rbacService.updateRolePermissions(
      roleId,
      body.permissions,
      req.user?.id,
    );
  }
}
