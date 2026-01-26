import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OutboxEventEnvelope, OutboxEventName } from "@common/types/events";
import { randomUUID } from "crypto";
import { SystemType } from "@common/types/system";

import { OutboxMessageSpd } from "@common/entities/spd/outbox-message.entity";
import { OutboxMessageSicgem } from "@common/entities/sicgem/outbox-message.entity";

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxMessageSpd) private repoSpd: Repository<OutboxMessageSpd>,
    @InjectRepository(OutboxMessageSicgem) private repoSicgem: Repository<OutboxMessageSicgem>
  ) { }

  private getRepo(system?: SystemType): Repository<any> {
    if (!system) {
      // Fallback or error if system is mandatory. Use global or default?
      // Since we split logic, assuming caller MUST provide system or we default to one?
      // Let's require system.
      throw new BadRequestException("Sistema requerido para outbox");
    }
    if (system === 'SPD') return this.repoSpd;
    if (system === 'SICGEM') return this.repoSicgem;
    throw new BadRequestException(`Sistema inválido: ${system}`);
  }

  // Note: Added system parameter to enqueue
  async enqueue(name: OutboxEventName, payload: Record<string, unknown>, requestId: string, system: SystemType, correlationId?: string) {
    const envelope: OutboxEventEnvelope = {
      id: randomUUID(),
      name,
      occurredAt: new Date().toISOString(),
      payload,
      requestId,
      correlationId
    };

    const repo = this.getRepo(system);

    await repo.insert({
      id: envelope.id,
      name: envelope.name,
      payload: envelope as any,
      occurred_at: new Date(envelope.occurredAt)
    });

    return envelope.id;
  }
}