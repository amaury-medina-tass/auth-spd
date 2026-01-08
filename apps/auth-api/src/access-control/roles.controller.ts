import { Body, Controller, Get, Post, Put, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesService } from "./roles.service";

@Controller("access-control/roles")
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private svc: RolesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { name: string; description?: string }) {
    return this.svc.create(body);
  }

  @Put(":id/permissions")
  setPermissions(
    @Param("id") id: string,
    @Body() body: { items: Array<{ permissionId: string; allowed: boolean }> }
  ) {
    return this.svc.setRolePermissions(id, body.items ?? []);
  }
}