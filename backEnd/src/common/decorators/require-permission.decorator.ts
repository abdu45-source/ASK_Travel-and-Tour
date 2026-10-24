import { SetMetadata } from '@nestjs/common';
import { Permission, PermissionScope } from '../enums/permissions.enum';

export const PERMISSION_KEY = 'required_permission';
export const SCOPE_KEY = 'required_scope';
export const IS_PUBLIC_KEY = 'is_public';

export const RequirePermission = (permission: Permission, defaultScope?: PermissionScope) =>
  SetMetadata(PERMISSION_KEY, { permission, defaultScope });

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
