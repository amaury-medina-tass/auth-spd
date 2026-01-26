import { Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BasePermission } from "../base/base-permission.entity";
import { ModuleSpd } from "./module.entity";
import { ActionSpd } from "./action.entity";
import { RolePermissionSpd } from "./role-permission.entity";

@Entity({ name: "permissions", schema: "spd" })
@Index(["module_id", "action_id"], { unique: true })
export class PermissionSpd extends BasePermission {
    @ManyToOne(() => ModuleSpd, (m) => m.permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "module_id" })
    module!: ModuleSpd;

    @ManyToOne(() => ActionSpd, (a) => a.permissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "action_id" })
    action!: ActionSpd;

    @OneToMany(() => RolePermissionSpd, (rp) => rp.permission)
    role_permissions!: RolePermissionSpd[];
}
