import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ModulesService } from "./modules.service";

@Controller("access-control/modules")
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(private svc: ModulesService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { name: string; path: string; description?: string }) {
    return this.svc.create(body);
  }
}