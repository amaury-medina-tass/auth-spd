import { ServiceBusClient } from "@azure/service-bus";
import { OutboxEventEnvelope } from "@common/types/events";

export class ServiceBusPublisher {
  private client: ServiceBusClient;

  constructor(private connectionString: string, private topicName: string) {
    this.client = new ServiceBusClient(connectionString);
  }

  async publish(envelope: OutboxEventEnvelope, subjectPrefix = ""): Promise<void> {
    const sender = this.client.createSender(this.topicName);

    const subject = `${subjectPrefix}${envelope.name}`;
    await sender.sendMessages({
      subject,
      contentType: "application/json",
      body: envelope,
      messageId: envelope.id
    });

    await sender.close();
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}