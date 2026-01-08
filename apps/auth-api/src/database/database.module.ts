import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@common/entities/user.entity";
import { Role } from "@common/entities/role.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { Permission } from "@common/entities/permission.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { RefreshToken } from "@common/entities/refresh-token.entity";
import { OutboxMessage } from "@common/entities/outbox-message.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "postgres",
        url: cfg.get<string>("databaseUrl"),
        entities: [
          User,
          Role,
          ModuleEntity,
          ActionEntity,
          Permission,
          RolePermission,
          UserRole,
          RefreshToken,
          OutboxMessage
        ],
        synchronize: true
      })
    })
  ]
})
export class DatabaseModule {}