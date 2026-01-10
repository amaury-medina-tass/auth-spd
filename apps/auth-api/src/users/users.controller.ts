import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) { }

  @Get()
  @ResponseMessage("Lista de usuarios obtenida")
  list(
    @Req() req: any,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC"
  ) {
    const system = req.user?.system;
    return this.svc.findAllPaginated(+page, +limit, system, search, sortBy, sortOrder);
  }

  @Get(":id")
  @ResponseMessage("Usuario obtenido")
  findOne(@Req() req: any, @Param("id") id: string) {
    const system = req.user?.system;
    return this.svc.findOne(id, system);
  }

  @Patch(":id")
  @ResponseMessage("Usuario actualizado")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    const system = req.user?.system;
    return this.svc.update(id, system, dto);
  }

  @Post("assign-role")
  @ResponseMessage("Rol asignado exitosamente")
  assignRole(@Req() req: any, @Body() dto: AssignRoleDto) {
    const system = req.user?.system;
    return this.svc.assignRole(dto.userId, dto.roleId, system);
  }

  @Delete("unassign-role")
  @ResponseMessage("Rol desasignado exitosamente")
  unassignRole(@Req() req: any, @Body() dto: AssignRoleDto) {
    const system = req.user?.system;
    return this.svc.unassignRole(dto.userId, dto.roleId, system);
  }

  @Delete(":id")
  @ResponseMessage("Usuario eliminado exitosamente")
  delete(@Req() req: any, @Param("id") id: string) {
    const system = req.user?.system;
    return this.svc.delete(id, system);
  }
}