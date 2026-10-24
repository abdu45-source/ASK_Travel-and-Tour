import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserRole } from '../../entities/user-role.entity';
import { Permission, PermissionScope } from '../../common/enums/permissions.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
    private auditService: AuditService,
  ) {}

  async getUserEffectivePermissions(userId: string): Promise<{
    roles: string[];
    permissions: Record<string, PermissionScope>;
  }> {
    const userRoles = await this.userRoleRepo.find({
      where: { user_id: userId },
      relations: ['role', 'role.rolePermissions'],
    });

    const roles: string[] = [];
    const permissions: Record<string, PermissionScope> = {};

    for (const ur of userRoles) {
      if (!ur.role) continue;
      roles.push(ur.role.role_name);

      for (const rp of ur.role.rolePermissions || []) {
        // Priority order of scope: ANY > TEAM > ASSIGNED > OWN
        const currentScope = permissions[rp.permission];
        if (!currentScope) {
          permissions[rp.permission] = rp.scope;
        } else if (rp.scope === PermissionScope.ANY) {
          permissions[rp.permission] = PermissionScope.ANY;
        } else if (rp.scope === PermissionScope.TEAM && currentScope !== PermissionScope.ANY) {
          permissions[rp.permission] = PermissionScope.TEAM;
        } else if (
          rp.scope === PermissionScope.ASSIGNED &&
          currentScope !== PermissionScope.ANY &&
          currentScope !== PermissionScope.TEAM
        ) {
          permissions[rp.permission] = PermissionScope.ASSIGNED;
        }
      }
    }

    return { roles, permissions };
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: ['rolePermissions'],
      order: { role_name: 'ASC' },
    });
  }

  async getAllPermissionsList(): Promise<string[]> {
    return Object.values(Permission);
  }

  async updateRolePermissions(
    roleId: string,
    permissions: { permission: Permission; scope: PermissionScope }[],
    actorId?: string,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['rolePermissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Safety lockout protection: Owner cannot remove ROLE_MANAGE from OWNER role
    if (role.role_name === 'OWNER') {
      const hasRoleManage = permissions.some(
        (p) => p.permission === Permission.ROLE_MANAGE && p.scope === PermissionScope.ANY,
      );
      if (!hasRoleManage) {
        throw new BadRequestException('Cannot remove ROLE_MANAGE from OWNER role (lockout protection).');
      }
    }

    const beforeState = role.rolePermissions.map((rp) => ({
      permission: rp.permission,
      scope: rp.scope,
    }));

    // Delete existing permissions for role
    await this.rolePermissionRepo.delete({ role_id: roleId });

    // Insert new permissions
    const newRolePermissions = permissions.map((p) =>
      this.rolePermissionRepo.create({
        role_id: roleId,
        permission: p.permission,
        scope: p.scope || PermissionScope.ANY,
      }),
    );
    await this.rolePermissionRepo.save(newRolePermissions);

    // Audit log
    await this.auditService.log({
      actorId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityType: 'Role',
      entityId: roleId,
      before: beforeState,
      after: permissions,
    });

    return this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['rolePermissions'],
    });
  }

  async assignRoleToUser(userId: string, roleName: string, assignedBy?: string): Promise<UserRole> {
    const role = await this.roleRepo.findOne({ where: { role_name: roleName } });
    if (!role) {
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    let userRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: role.id },
    });

    if (!userRole) {
      userRole = this.userRoleRepo.create({
        user_id: userId,
        role_id: role.id,
        assigned_by: assignedBy,
      });
      await this.userRoleRepo.save(userRole);
    }
    return userRole;
  }
}
