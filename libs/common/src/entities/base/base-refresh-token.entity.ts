import { Column, Index, PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseRefreshToken {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({ type: "uuid" })
    user_id!: string;

    @Column({ type: "text" })
    token_hash!: string;

    @Column({ type: "boolean", default: false })
    revoked!: boolean;

    @Column({ type: "timestamp" })
    expires_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
