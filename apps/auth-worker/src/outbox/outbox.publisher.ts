import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ServiceBusPublisher } from "@common/messaging/servicebus.publisher";
import { OutboxEventEnvelope } from "@common/types/events";

@Injectable()
export class OutboxPublisher {
  private publisher: ServiceBusPublisher | null = null;
  private subjectPrefix: string;

  constructor(private cfg: ConfigService) {
    const cs = this.cfg.get<string>("serviceBus.connectionString") ?? "";
    const topic = this.cfg.get<string>("serviceBus.topic") ?? "spd.events";
    this.subjectPrefix = this.cfg.get<string>("serviceBus.subjectPrefix") ?? "Auth.";

    if (cs) {
      this.publisher = new ServiceBusPublisher(cs, topic);
    }
  }

  async publish(envelope: OutboxEventEnvelope) {
    if (!this.publisher) return;
    await this.publisher.publish(envelope, this.subjectPrefix);
  }
}