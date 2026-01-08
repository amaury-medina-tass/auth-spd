import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OutboxMessage } from "@common/entities/outbox-message.entity";
import { OutboxEventEnvelope, OutboxEventName } from "@common/types/events";
import { randomUUID } from "crypto";

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxMessage)
    private readonly repo: Repository<OutboxMessage>
  ) {}

  async enqueue(name: OutboxEventName, payload: Record<string, unknown>, requestId: string, correlationId?: string) {
    const envelope: OutboxEventEnvelope = {
      id: randomUUID(),
      name,
      occurredAt: new Date().toISOString(),
      payload,
      requestId,
      correlationId
    };

    await this.repo.insert({
      id: envelope.id,
      name: envelope.name,
      payload: envelope as any,
      occurred_at: new Date(envelope.occurredAt)
    });

    return envelope.id;
  }
}