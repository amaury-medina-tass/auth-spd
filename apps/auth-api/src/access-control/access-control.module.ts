import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "@common/entities/role.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { Permission } from "@common/entities/permission.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { UserRole } from "@common/entities/user-role.entity";
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
    TypeOrmModule.forFeature([Role, ModuleEntity, ActionEntity, Permission, RolePermission, UserRole])
  ],
  controllers: [RolesController, ModulesController, ActionsController, PermissionsController],
  providers: [RolesService, ModulesService, ActionsService, PermissionsService, PermissionsGuard]
})
export class AccessControlModule { }
