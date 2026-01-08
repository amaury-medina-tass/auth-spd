import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsService } from "./permissions.service";

@Controller("access-control/permissions")
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private svc: PermissionsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { moduleId: string; actionId: string }) {
    return this.svc.create(body);
  }
}