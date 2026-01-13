import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { OutboxMessage } from "@common/entities/outbox-message.entity";
import { OutboxPublisher } from "./outbox.publisher";

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectRepository(OutboxMessage) private outbox: Repository<OutboxMessage>,
    private publisher: OutboxPublisher
  ) { }

  @Cron("*/2 * * * * *")
  async tick() {
    const batch = await this.outbox.find({
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
        await this.outbox.save(msg);
      } catch (e: any) {
        msg.attempts += 1;
        msg.last_error = String(e?.message ?? e);
        msg.updated_at = new Date();
        await this.outbox.save(msg);

        this.logger.error(`Outbox publish failed: ${msg.id} attempts=${msg.attempts} err=${msg.last_error}`);
      }
    }
  }
}