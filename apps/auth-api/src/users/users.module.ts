import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, Role])],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule { }