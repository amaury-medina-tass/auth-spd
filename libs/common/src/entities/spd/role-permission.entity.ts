import { Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseRolePermission } from "../base/base-role-permission.entity";
import { RoleSpd } from "./role.entity";
import { PermissionSpd } from "./permission.entity";

@Entity({ name: "role_permissions", schema: "spd" })
@Index(["role_id", "permission_id"], { unique: true })
export class RolePermissionSpd extends BaseRolePermission {
    @ManyToOne(() => RoleSpd, (r) => r.role_permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "role_id" })
    role!: RoleSpd;

    @ManyToOne(() => PermissionSpd, { onDelete: "CASCADE" })
    @JoinColumn({ name: "permission_id" })
    permission!: PermissionSpd;
}
