import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxMessageSpd } from "@common/entities/spd/outbox-message.entity";
import { OutboxMessageSicgem } from "@common/entities/sicgem/outbox-message.entity";
import { OutboxService } from "./outbox.service";

@Module({
  imports: [TypeOrmModule.forFeature([
    OutboxMessageSpd,
    OutboxMessageSicgem
  ])],
  providers: [OutboxService],
  exports: [OutboxService]
})
export class OutboxModule { }