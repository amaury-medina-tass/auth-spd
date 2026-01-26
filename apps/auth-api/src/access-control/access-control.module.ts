import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RoleSpd } from "@common/entities/spd/role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { ModuleSpd } from "@common/entities/spd/module.entity";
import { ModuleSicgem } from "@common/entities/sicgem/module.entity";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { PermissionSpd } from "@common/entities/spd/permission.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";
import { RolePermissionSpd } from "@common/entities/spd/role-permission.entity";
import { RolePermissionSicgem } from "@common/entities/sicgem/role-permission.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";

import { OutboxModule } from "../outbox/outbox.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../common/guards/permissions.guard";

import { RolesController } from "./controllers/roles.controller";
import { RolesService } from "./services/roles.service";
import { ModulesController } from "./controllers/modules.controller";
import { ModulesService } from "./services/modules.service";
import { ActionsController } from "./controllers/actions.controller";
import { ActionsService } from "./services/actions.service";
import { PermissionsController } from "./controllers/permissions.controller";
import { PermissionsService } from "./services/permissions.service";

@Module({
  imports: [
    OutboxModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      RoleSpd, RoleSicgem,
      ModuleSpd, ModuleSicgem,
      ActionSpd, ActionSicgem,
      PermissionSpd, PermissionSicgem,
      RolePermissionSpd, RolePermissionSicgem,
      UserRoleSpd, UserRoleSicgem
    ])
  ],
  controllers: [RolesController, ModulesController, ActionsController, PermissionsController],
  providers: [RolesService, ModulesService, ActionsService, PermissionsService, PermissionsGuard],
  exports: [RolesService, ModulesService, ActionsService, PermissionsService] // Usually helpful to export services
})
export class AccessControlModule { }
