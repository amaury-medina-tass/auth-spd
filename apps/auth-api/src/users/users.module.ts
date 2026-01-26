import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserSpd } from "@common/entities/spd/user.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UserRoleController } from "./user-role.controller";
import { UserRoleService } from "./user-role.service";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSpd, UserRoleSpd, RoleSpd,
      UserSicgem, UserRoleSicgem, RoleSicgem
    ]),
    forwardRef(() => AuthModule)
  ],
  controllers: [UsersController, UserRoleController],
  providers: [UsersService, UserRoleService, PermissionsGuard]
})
export class UsersModule { }
