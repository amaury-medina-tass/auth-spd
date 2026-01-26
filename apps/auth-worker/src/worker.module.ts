import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import configuration from "../../auth-api/src/config/configuration";
import { envValidationSchema } from "../../auth-api/src/config/env.validation";
import { DatabaseModule } from "../../auth-api/src/database/database.module";
import { OutboxMessageSpd } from "@common/entities/spd/outbox-message.entity";
import { OutboxMessageSicgem } from "@common/entities/sicgem/outbox-message.entity";
import { OutboxPublisher } from "./outbox/outbox.publisher";
import { OutboxProcessor } from "./outbox/outbox.processor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TypeOrmModule.forFeature([
      OutboxMessageSpd,
      OutboxMessageSicgem
    ])
  ],
  providers: [OutboxPublisher, OutboxProcessor]
})
export class WorkerModule { }