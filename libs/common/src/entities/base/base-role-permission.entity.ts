import { Column } from "typeorm";

export abstract class BaseRolePermission {
    @Column({ type: "uuid", primary: true })
    role_id!: string;

    @Column({ type: "uuid", primary: true })
    permission_id!: string;

    @Column({ type: "boolean", default: true })
    allowed!: boolean;

    @Column({ type: "timestamp", default: () => "now()" })
    created_at!: Date;

    @Column({ type: "timestamp", default: () => "now()" })
    updated_at!: Date;
}
