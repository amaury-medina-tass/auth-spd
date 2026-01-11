import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role]),
    forwardRef(() => AuthModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, PermissionsGuard]
})
export class UsersModule { }
