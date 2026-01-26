import { Column, Index, PrimaryGeneratedColumn } from "typeorm";

@Index(["name", "system"], { unique: true })
export abstract class BaseModule {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index({ unique: true })
    @Column({ type: "varchar", length: 200 })
    name!: string;

    @Column({ type: "text", nullable: true })
    description!: string | null;

    @Index({ unique: true })
    @Column({ type: "varchar", length: 200 })
    path!: string;

    @Column({ type: "enum", enum: ["PUBLIC", "SPD", "SICGEM"], default: "PUBLIC" })
    system!: "PUBLIC" | "SPD" | "SICGEM";

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
