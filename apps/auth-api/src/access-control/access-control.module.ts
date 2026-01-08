import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "@common/entities/role.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { Permission } from "@common/entities/permission.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { OutboxModule } from "../outbox/outbox.module";

import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { ModulesController } from "./modules.controller";
import { ModulesService } from "./modules.service";
import { ActionsController } from "./actions.controller";
import { ActionsService } from "./actions.service";
import { PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [
    OutboxModule,
    TypeOrmModule.forFeature([Role, ModuleEntity, ActionEntity, Permission, RolePermission, UserRole])
  ],
  controllers: [RolesController, ModulesController, ActionsController, PermissionsController],
  providers: [RolesService, ModulesService, ActionsService, PermissionsService]
})
export class AccessControlModule {}