import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";

// SPD Entities
import { UserSpd } from "@common/entities/spd/user.entity";
import { RefreshTokenSpd } from "@common/entities/spd/refresh-token.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { RolePermissionSpd } from "@common/entities/spd/role-permission.entity";
import { ModuleSpd } from "@common/entities/spd/module.entity";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { PermissionSpd } from "@common/entities/spd/permission.entity";

// SICGEM Entities
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { RefreshTokenSicgem } from "@common/entities/sicgem/refresh-token.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { RolePermissionSicgem } from "@common/entities/sicgem/role-permission.entity";
import { ModuleSicgem } from "@common/entities/sicgem/module.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./services/token.service";
import { PasswordService } from "./services/password.service";
import { VerificationService } from "./services/verification.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { PermissionsResolverService } from "./services/permissions-resolver.service";
import { OutboxModule } from "../outbox/outbox.module";
import { RedisModule } from "@common/redis/redis.module";

@Module({
  imports: [
    RedisModule,
    PassportModule,
    OutboxModule,
    TypeOrmModule.forFeature([
      // SPD
      UserSpd,
      RefreshTokenSpd,
      UserRoleSpd,
      RolePermissionSpd,
      RoleSpd,
      ModuleSpd,
      ActionSpd,
      PermissionSpd,

      // SICGEM
      UserSicgem,
      RefreshTokenSicgem,
      UserRoleSicgem,
      RolePermissionSicgem,
      RoleSicgem,
      ModuleSicgem,
      ActionSicgem,
      PermissionSicgem
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        privateKey: cfg.get<string>("jwt.accessPrivateKey"),
        publicKey: cfg.get<string>("jwt.accessPublicKey"),
        signOptions: {
          algorithm: "RS256",
          expiresIn: cfg.get<string>("jwt.accessExpiresIn") as any
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    VerificationService,
    JwtStrategy,
    PermissionsResolverService
  ],
  exports: [AuthService, PermissionsResolverService]
})
export class AuthModule { }