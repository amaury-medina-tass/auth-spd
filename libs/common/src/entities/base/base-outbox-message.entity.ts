import { Column, Index, PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseOutboxMessage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({ type: "varchar", length: 200 })
    name!: string;

    @Column({ type: "jsonb" })
    payload!: Record<string, unknown>;

    @Column({ type: "timestamp", default: () => "now()" })
    occurred_at!: Date;

    @Index()
    @Column({ type: "timestamp", nullable: true })
    processed_at!: Date | null;

    @Column({ type: "int", default: 0 })
    attempts!: number;

    @Column({ type: "text", nullable: true })
    last_error!: string | null;

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
