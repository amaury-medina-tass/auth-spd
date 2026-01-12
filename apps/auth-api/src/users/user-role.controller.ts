import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRoleService } from "./user-role.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AssignRoleBodyDto } from "./dto/assign-role-body.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserRoleController {
    constructor(private svc: UserRoleService) { }

    @Get(":id/roles")
    @RequirePermission("/access-control/users", "READ")
    @ResponseMessage("Roles del usuario obtenidos")
    getUserRoles(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.getUserWithRoles(id, system);
    }

    @Post(":id/roles")
    @RequirePermission("/access-control/users", "ASSIGN_ROLE")
    @ResponseMessage("Rol asignado exitosamente")
    assignRole(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Body() dto: AssignRoleBodyDto) {
        return this.svc.assignRole(id, dto.roleId, system);
    }

    @Delete(":id/roles/:roleId")
    @RequirePermission("/access-control/users", "ASSIGN_ROLE")
    @ResponseMessage("Rol desasignado exitosamente")
    unassignRole(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Param("roleId") roleId: string) {
        return this.svc.unassignRole(id, roleId, system);
    }
}
