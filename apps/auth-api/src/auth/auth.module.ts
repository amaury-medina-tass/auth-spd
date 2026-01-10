import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";

import { User } from "@common/entities/user.entity";
import { RefreshToken } from "@common/entities/refresh-token.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { Permission } from "@common/entities/permission.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./services/token.service";
import { PasswordService } from "./services/password.service";
import { VerificationService } from "./services/verification.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { PermissionsResolverService } from "./services/permissions-resolver.service";
import { OutboxModule } from "../outbox/outbox.module";
import { EmailModule } from "@common/email/email.module";

@Module({
  imports: [
    PassportModule,
    OutboxModule,
    EmailModule,
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      UserRole,
      RolePermission,
      Permission,
      Role,
      ModuleEntity,
      ActionEntity
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