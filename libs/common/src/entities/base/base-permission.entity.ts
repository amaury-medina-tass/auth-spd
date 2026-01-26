import { Column, PrimaryGeneratedColumn } from "typeorm";

export abstract class BasePermission {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    module_id!: string;

    @Column({ type: "uuid" })
    action_id!: string;

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
