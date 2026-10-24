import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from '../decorators/require-permission.decorator';
import { Permission, PermissionScope } from '../enums/permissions.enum';
import { RbacService } from '../../modules/rbac/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const permissionMeta = this.reflector.getAllAndOverride<{
      permission: Permission;
      defaultScope?: PermissionScope;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!permissionMeta) {
      // Default deny for guarded routes with no explicit permission specified
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User is unauthenticated');
    }

    // Dynamic attribute lookup from DB
    const { permissions } = await this.rbacService.getUserEffectivePermissions(user.id);
    const userScope = permissions[permissionMeta.permission];

    if (!userScope) {
      throw new ForbiddenException(
        `Access denied: Missing required permission ${permissionMeta.permission}`,
      );
    }

    // Attach effective permissions & userScope to request for downstream handlers
    request.userPermissionScope = userScope;
    request.userEffectivePermissions = permissions;

    return true;
  }
}
