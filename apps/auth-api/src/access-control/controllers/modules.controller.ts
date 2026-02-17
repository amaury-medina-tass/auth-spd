import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ModulesService } from "../services/modules.service";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { CreateModuleDto } from "../dto/create-module.dto";
import { UpdateModuleDto } from "../dto/update-module.dto";

@Controller("access-control/modules")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModulesController {
    constructor(private readonly svc: ModulesService) { }

    @Get()
    @RequirePermission("/access-control/modules", "READ")
    @ResponseMessage("Lista de módulos obtenida")
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
    @RequirePermission("/access-control/modules", "READ")
    @ResponseMessage("Lista completa de módulos obtenida")
    listAll(@CurrentUser("system") system: SystemType) {
        return this.svc.findAll(system);
    }

    @Get(":id")
    @RequirePermission("/access-control/modules", "READ")
    @ResponseMessage("Módulo obtenido")
    findOne(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.findOne(id, system);
    }

    @Get(":id/actions")
    @RequirePermission("/access-control/modules", "ASSIGN_ACTION")
    @ResponseMessage("Acciones del módulo obtenidas")
    getModuleActions(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.getModuleWithActions(id, system);
    }

    @Post(":id/actions")
    @RequirePermission("/access-control/modules", "ASSIGN_ACTION")
    @ResponseMessage("Acción asignada al módulo exitosamente")
    addAction(
        @CurrentUser("system") system: SystemType,
        @Param("id") id: string,
        @Body() body: { actionId: string }
    ) {
        return this.svc.addActionToModule(id, body.actionId, system);
    }

    @Delete(":id/actions/:actionId")
    @RequirePermission("/access-control/modules", "ASSIGN_ACTION")
    @ResponseMessage("Acción removida del módulo exitosamente")
    removeAction(
        @CurrentUser("system") system: SystemType,
        @Param("id") id: string,
        @Param("actionId") actionId: string
    ) {
        return this.svc.removeActionFromModule(id, actionId, system);
    }

    @Post()
    @RequirePermission("/access-control/modules", "CREATE")
    @ResponseMessage("Módulo creado exitosamente")
    create(@CurrentUser("system") system: SystemType, @Body() dto: CreateModuleDto) {
        return this.svc.create(dto, system);
    }

    @Patch(":id")
    @RequirePermission("/access-control/modules", "UPDATE")
    @ResponseMessage("Módulo actualizado exitosamente")
    update(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Body() dto: UpdateModuleDto) {
        return this.svc.update(id, system, dto);
    }

    @Delete(":id")
    @RequirePermission("/access-control/modules", "DELETE")
    @ResponseMessage("Módulo eliminado exitosamente")
    delete(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.delete(id, system);
    }
}
