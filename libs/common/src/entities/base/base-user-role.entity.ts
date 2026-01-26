import { Column } from "typeorm";

export abstract class BaseUserRole {
    @Column({ type: "uuid", primary: true })
    user_id!: string;

    @Column({ type: "uuid", primary: true })
    role_id!: string;

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
