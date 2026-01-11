import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private svc: UsersService) { }

  @Get()
  @RequirePermission("/access-control/users", "READ")
  @ResponseMessage("Lista de usuarios obtenida")
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

  @Get(":id")
  @RequirePermission("/access-control/users", "READ")
  @ResponseMessage("Usuario obtenido")
  findOne(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
    return this.svc.findOne(id, system);
  }

  @Patch(":id")
  @RequirePermission("/access-control/users", "UPDATE")
  @ResponseMessage("Usuario actualizado")
  update(@CurrentUser("system") system: SystemType, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, system, dto);
  }

  @Post("assign-role")
  @RequirePermission("/access-control/users", "ASSIGN_ROLE")
  @ResponseMessage("Rol asignado exitosamente")
  assignRole(@CurrentUser("system") system: SystemType, @Body() dto: AssignRoleDto) {
    return this.svc.assignRole(dto.userId, dto.roleId, system);
  }

  @Delete("unassign-role")
  @RequirePermission("/access-control/users", "ASSIGN_ROLE")
  @ResponseMessage("Rol desasignado exitosamente")
  unassignRole(@CurrentUser("system") system: SystemType, @Body() dto: AssignRoleDto) {
    return this.svc.unassignRole(dto.userId, dto.roleId, system);
  }

  @Delete(":id")
  @RequirePermission("/access-control/users", "DELETE")
  @ResponseMessage("Usuario eliminado exitosamente")
  delete(@CurrentUser("system") system: SystemType, @Param("id") id: string) {
    return this.svc.delete(id, system);
  }
}

