import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RolesService } from "../services/roles.service";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";

@Controller("access-control/roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
    constructor(private readonly svc: RolesService) { }

    @Get()
    @RequirePermission("/access-control/roles", "READ")
    @ResponseMessage("Lista de roles obtenida")
    list(
        @CurrentUser("system") system: SystemType,
        @Query("page") page: string = "1",
        @Query("limit") limit: string = "10",
        @Query("search") search?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "ASC" | "DESC"
    ) {
        return this.svc.findAllPaginated(+page, +limit, system, search, sortBy, sortOrder);
    }

    @Get("all")
    @RequirePermission("/access-control/roles", "READ")
    @ResponseMessage("Lista completa de roles obtenida")
    listAll(@CurrentUser("system") system: SystemType) {
        return this.svc.findAll(system);
    }

    @Get(":id")
    @RequirePermission("/access-control/roles", "READ")
    @ResponseMessage("Rol obtenido")
    findOne(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.findOne(id, system);
    }

    @Get(":id/permissions")
    @RequirePermission("/access-control/roles", "READ")
    @ResponseMessage("Permisos del rol obtenidos")
    getRolePermissions(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.getRolePermissions(id, system);
    }

    @Patch(":id/permissions")
    @RequirePermission("/access-control/roles", "UPDATE")
    @ResponseMessage("Permisos del rol actualizados exitosamente")
    updateRolePermissions(
        @CurrentUser("system") system: SystemType,
        @Param("id") id: string,
        @Body() body: { permissionIds: string[] }
    ) {
        return this.svc.updateRolePermissions(id, system, body.permissionIds);
    }

    @Post()
    @RequirePermission("/access-control/roles", "CREATE")
    @ResponseMessage("Rol creado exitosamente")
    create(@CurrentUser("system") system: SystemType, @Body() dto: CreateRoleDto) {
        return this.svc.create(dto, system);
    }

    @Patch(":id")
    @RequirePermission("/access-control/roles", "UPDATE")
    @ResponseMessage("Rol actualizado exitosamente")
    update(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Body() dto: UpdateRoleDto) {
        return this.svc.update(id, system, dto);
    }

    @Delete(":id")
    @RequirePermission("/access-control/roles", "DELETE")
    @ResponseMessage("Rol eliminado exitosamente")
    delete(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.delete(id, system);
    }
}
