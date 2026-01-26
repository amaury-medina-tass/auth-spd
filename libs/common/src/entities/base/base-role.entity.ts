import { Column, Index, PrimaryGeneratedColumn } from "typeorm";

@Index(["name", "system"], { unique: true })
export abstract class BaseRole {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 200 })
    name!: string;

    @Column({ type: "text", nullable: true })
    description!: string | null;

    @Column({ type: "boolean", default: true })
    is_active!: boolean;

    @Column({ type: "boolean", default: false })
    is_default!: boolean;

    @Column({ type: "enum", enum: ["PUBLIC", "SPD", "SICGEM"], default: "PUBLIC" })
    system!: "PUBLIC" | "SPD" | "SICGEM";

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
