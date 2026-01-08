import { Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @ResponseMessage("Lista de usuarios obtenida")
  list() {
    return this.svc.findAll();
  }

  @Patch(":id/deactivate")
  @ResponseMessage("Usuario desactivado correctamente")
  deactivate(@Param("id") id: string) {
    return this.svc.deactivate(id);
  }
}