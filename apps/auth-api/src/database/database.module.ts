import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserSpd } from "@common/entities/spd/user.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { RefreshTokenSpd } from "@common/entities/spd/refresh-token.entity";
import { RolePermissionSpd } from "@common/entities/spd/role-permission.entity";
import { ModuleSpd } from "@common/entities/spd/module.entity";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { PermissionSpd } from "@common/entities/spd/permission.entity";
import { OutboxMessageSpd } from "@common/entities/spd/outbox-message.entity";

import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";
import { RefreshTokenSicgem } from "@common/entities/sicgem/refresh-token.entity";
import { RolePermissionSicgem } from "@common/entities/sicgem/role-permission.entity";
import { ModuleSicgem } from "@common/entities/sicgem/module.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";
import { OutboxMessageSicgem } from "@common/entities/sicgem/outbox-message.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "postgres",
        url: cfg.get<string>("databaseUrl"),
        entities: [
          // SPD Schema
          UserSpd,
          RoleSpd,
          UserRoleSpd,
          RefreshTokenSpd,
          RolePermissionSpd,
          ModuleSpd,
          ActionSpd,
          PermissionSpd,
          OutboxMessageSpd,

          // SICGEM Schema
          UserSicgem,
          RoleSicgem,
          UserRoleSicgem,
          RefreshTokenSicgem,
          RolePermissionSicgem,
          ModuleSicgem,
          ActionSicgem,
          PermissionSicgem,
          OutboxMessageSicgem,
        ],
        synchronize: true
      })
    })
  ]
})
export class DatabaseModule { }