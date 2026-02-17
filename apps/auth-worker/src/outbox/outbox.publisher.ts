import { Injectable, Logger } from "@nestjs/common";
import { OutboxEventEnvelope } from "@common/types/events";

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  async publish(envelope: OutboxEventEnvelope) {
    // Azure Service Bus integration pending configuration
    this.logger.log(
      `[MOCK PUBLISH] ${envelope.name} payload=${JSON.stringify(envelope.payload)}`
    );
  }
}