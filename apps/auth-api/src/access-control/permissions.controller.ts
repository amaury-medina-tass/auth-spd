import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PermissionsService } from "./permissions.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@Controller("access-control/permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private svc: PermissionsService) { }

  @Get()
  @RequirePermission("/access-control/permissions", "READ")
  @ResponseMessage("Lista de permisos obtenida")
  list(
    @CurrentUser("system") system: SystemType,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10"
  ) {
    return this.svc.findAllPaginated(+page, +limit, system);
  }

  @Get(":id")
  @RequirePermission("/access-control/permissions", "READ")
  @ResponseMessage("Permiso obtenido")
  findOne(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
    return this.svc.findOne(id, system);
  }

  @Post()
  @RequirePermission("/access-control/permissions", "CREATE")
  @ResponseMessage("Permiso creado exitosamente")
  create(@CurrentUser("system") system: SystemType, @Body() dto: CreatePermissionDto) {
    return this.svc.create(dto, system);
  }

  @Delete(":id")
  @RequirePermission("/access-control/permissions", "DELETE")
  @ResponseMessage("Permiso eliminado exitosamente")
  delete(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
    return this.svc.delete(id, system);
  }
}
