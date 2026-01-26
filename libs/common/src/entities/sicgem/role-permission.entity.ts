import { Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseRolePermission } from "../base/base-role-permission.entity";
import { RoleSicgem } from "./role.entity";
import { PermissionSicgem } from "./permission.entity";

@Entity({ name: "role_permissions", schema: "sicgem" })
@Index(["role_id", "permission_id"], { unique: true })
export class RolePermissionSicgem extends BaseRolePermission {
    @ManyToOne(() => RoleSicgem, (r) => r.role_permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "role_id" })
    role!: RoleSicgem;

    @ManyToOne(() => PermissionSicgem, { onDelete: "CASCADE" })
    @JoinColumn({ name: "permission_id" })
    permission!: PermissionSicgem;
}
