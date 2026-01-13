import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { envValidationSchema } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { CosmosDbModule } from "@common/cosmosdb";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AccessControlModule } from "./access-control/access-control.module";
import { OutboxModule } from "./outbox/outbox.module";
import { AuditModule } from "./audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema
    }),
    DatabaseModule,
    CosmosDbModule.forRootAsync(),
    OutboxModule,
    AuthModule,
    UsersModule,
    AccessControlModule,
    AuditModule
  ]
})
export class AppModule { }