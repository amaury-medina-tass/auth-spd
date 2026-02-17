import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ActionsService } from "../services/actions.service";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { CreateActionDto } from "../dto/create-action.dto";
import { UpdateActionDto } from "../dto/update-action.dto";

@Controller("access-control/actions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActionsController {
    constructor(private readonly svc: ActionsService) { }

    @Get()
    @RequirePermission("/access-control/actions", "READ")
    @ResponseMessage("Lista de acciones obtenida")
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
    @RequirePermission("/access-control/actions", "READ")
    @ResponseMessage("Lista completa de acciones obtenida")
    listAll(@CurrentUser("system") system: SystemType) {
        return this.svc.findAll(system);
    }

    @Get(":id")
    @RequirePermission("/access-control/actions", "READ")
    @ResponseMessage("Acción obtenida")
    findOne(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.findOne(id, system);
    }

    @Post()
    @RequirePermission("/access-control/actions", "CREATE")
    @ResponseMessage("Acción creada exitosamente")
    create(@CurrentUser("system") system: SystemType, @Body() dto: CreateActionDto) {
        return this.svc.create(dto, system);
    }

    @Patch(":id")
    @RequirePermission("/access-control/actions", "UPDATE")
    @ResponseMessage("Acción actualizada exitosamente")
    update(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Body() dto: UpdateActionDto) {
        return this.svc.update(id, system, dto);
    }

    @Delete(":id")
    @RequirePermission("/access-control/actions", "DELETE")
    @ResponseMessage("Acción eliminada exitosamente")
    delete(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
        return this.svc.delete(id, system);
    }
}
