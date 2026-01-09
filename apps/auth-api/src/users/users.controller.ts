import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
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
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC"
  ) {
    return this.svc.findAllPaginated(+page, +limit, search, sortBy, sortOrder);
  }

  @Get(":id")
  @ResponseMessage("Usuario obtenido")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Patch(":id")
  @ResponseMessage("Usuario actualizado")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, dto);
  }

  @Post("assign-role")
  @ResponseMessage("Rol asignado exitosamente")
  assignRole(@Body() dto: AssignRoleDto) {
    return this.svc.assignRole(dto.userId, dto.roleId);
  }

  @Delete("unassign-role")
  @ResponseMessage("Rol desasignado exitosamente")
  unassignRole(@Body() dto: AssignRoleDto) {
    return this.svc.unassignRole(dto.userId, dto.roleId);
  }

  @Delete(":id")
  @ResponseMessage("Usuario eliminado exitosamente")
  delete(@Param("id") id: string) {
    return this.svc.delete(id);
  }
}