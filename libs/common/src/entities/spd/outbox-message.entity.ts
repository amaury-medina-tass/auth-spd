import { Entity } from "typeorm";
import { BaseOutboxMessage } from "../base/base-outbox-message.entity";

@Entity({ name: "outbox_messages", schema: "spd" })
export class OutboxMessageSpd extends BaseOutboxMessage { }
