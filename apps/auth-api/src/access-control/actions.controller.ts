import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ActionsService } from "./actions.service";

@Controller("access-control/actions")
@UseGuards(JwtAuthGuard)
export class ActionsController {
  constructor(private svc: ActionsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() body: { name: string; description?: string }) {
    return this.svc.create(body);
  }
}