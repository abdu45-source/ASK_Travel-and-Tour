import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { UserRole } from '../../entities/user-role.entity';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, UserRole])],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
