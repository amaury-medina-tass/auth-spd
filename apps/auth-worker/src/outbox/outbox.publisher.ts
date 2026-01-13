import { Injectable, Logger } from "@nestjs/common";
// TODO: Descomentar cuando Azure esté listo
// import { ConfigService } from "@nestjs/config";
// import { ServiceBusPublisher } from "@common/messaging/servicebus.publisher";
import { OutboxEventEnvelope } from "@common/types/events";

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  // TODO: Descomentar cuando Azure esté listo
  // private publisher: ServiceBusPublisher | null = null;
  // private subjectPrefix: string;

  // constructor(private cfg: ConfigService) {
  //   const cs = this.cfg.get<string>("serviceBus.connectionString") ?? "";
  //   const topic = this.cfg.get<string>("serviceBus.topic") ?? "spd.events";
  //   this.subjectPrefix = this.cfg.get<string>("serviceBus.subjectPrefix") ?? "Auth.";

  //   if (cs) {
  //     this.publisher = new ServiceBusPublisher(cs, topic);
  //   }
  // }

  async publish(envelope: OutboxEventEnvelope) {
    // TODO: Descomentar cuando Azure esté listo
    // if (!this.publisher) return;
    // await this.publisher.publish(envelope, this.subjectPrefix);

    // Mock para pruebas sin Azure
    this.logger.log(
      `[MOCK PUBLISH] ${envelope.name} payload=${JSON.stringify(envelope.payload)}`
    );
  }
}