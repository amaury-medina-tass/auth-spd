import { Column, Index, PrimaryGeneratedColumn } from "typeorm";

@Index(["code_action", "system"], { unique: true })
export abstract class BaseAction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", length: 50 })
    code_action!: string;

    @Column({ type: "varchar", length: 100 })
    name!: string;

    @Column({ type: "text", nullable: true })
    description!: string | null;

    @Column({ type: "enum", enum: ["PUBLIC", "SPD", "SICGEM"], default: "PUBLIC" })
    system!: "PUBLIC" | "SPD" | "SICGEM";

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
