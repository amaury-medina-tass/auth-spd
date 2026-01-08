import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@common/entities/user.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { OutboxModule } from "../outbox/outbox.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), OutboxModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}