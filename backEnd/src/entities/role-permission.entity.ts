import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission, PermissionScope } from '../common/enums/permissions.enum';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn('uuid')
  role_id: string;

  @PrimaryColumn({
    type: 'enum',
    enum: Permission,
  })
  permission: Permission;

  @Column({
    type: 'enum',
    enum: PermissionScope,
    default: PermissionScope.ANY,
  })
  scope: PermissionScope;

  @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
