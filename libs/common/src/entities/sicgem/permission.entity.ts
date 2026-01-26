import { Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BasePermission } from "../base/base-permission.entity";
import { ModuleSicgem } from "./module.entity";
import { ActionSicgem } from "./action.entity";
import { RolePermissionSicgem } from "./role-permission.entity";

@Entity({ name: "permissions", schema: "sicgem" })
@Index(["module_id", "action_id"], { unique: true })
export class PermissionSicgem extends BasePermission {
    @ManyToOne(() => ModuleSicgem, (m) => m.permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "module_id" })
    module!: ModuleSicgem;

    @ManyToOne(() => ActionSicgem, (a) => a.permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "action_id" })
    action!: ActionSicgem;

    @OneToMany(() => RolePermissionSicgem, (rp) => rp.permission)
    role_permissions!: RolePermissionSicgem[];
}
