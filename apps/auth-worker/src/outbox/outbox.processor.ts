import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { OutboxMessageSpd } from "@common/entities/spd/outbox-message.entity";
import { OutboxMessageSicgem } from "@common/entities/sicgem/outbox-message.entity";
import { BaseOutboxMessage } from "@common/entities/base/base-outbox-message.entity";
import { OutboxPublisher } from "./outbox.publisher";

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectRepository(OutboxMessageSpd) private outboxSpd: Repository<OutboxMessageSpd>,
    @InjectRepository(OutboxMessageSicgem) private outboxSicgem: Repository<OutboxMessageSicgem>,
    private publisher: OutboxPublisher
  ) { }

  @Cron("*/2 * * * * *")
  async tick() {
    await this.processRepo(this.outboxSpd, "SPD");
    await this.processRepo(this.outboxSicgem, "SICGEM");
  }

  private async processRepo(repo: Repository<any>, systemName: string) {
    const batch = await repo.find({
      where: { processed_at: IsNull() },
      order: { occurred_at: "ASC" },
      take: 20
    });

    for (const msg of batch) {
      try {
        const envelope = msg.payload as any;
        await this.publisher.publish(envelope);

        msg.processed_at = new Date();
        msg.updated_at = new Date();
        await repo.save(msg);
      } catch (e: any) {
        msg.attempts = (msg.attempts || 0) + 1;
        msg.last_error = String(e?.message ?? e);
        msg.updated_at = new Date();
        await repo.save(msg);

        this.logger.error(`[${systemName}] Outbox publish failed: ${msg.id} attempts=${msg.attempts} err=${msg.last_error}`);
      }
    }
  }
}