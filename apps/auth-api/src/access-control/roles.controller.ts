import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesService } from "./roles.service";
import { ResponseMessage } from "../common/decorators/response-message.decorator";

@Controller("access-control/roles")
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private svc: RolesService) { }

  @Get()
  @ResponseMessage("Lista de roles obtenida")
  list(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC"
  ) {
    return this.svc.findAllPaginated(+page, +limit, search, sortBy, sortOrder);
  }

  @Get("all")
  @ResponseMessage("Lista completa de roles obtenida")
  listAll() {
    return this.svc.findAll();
  }
}