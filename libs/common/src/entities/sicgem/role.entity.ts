import { Entity, OneToMany } from "typeorm";
import { BaseRole } from "../base/base-role.entity";
import { UserRoleSicgem } from "./user-role.entity";
import { RolePermissionSicgem } from "./role-permission.entity";

@Entity({ name: "roles", schema: "sicgem" })
export class RoleSicgem extends BaseRole {
    @OneToMany(() => RolePermissionSicgem, (rp) => rp.role)
    role_permissions!: RolePermissionSicgem[];

    @OneToMany(() => UserRoleSicgem, (ur) => ur.role)
    user_roles!: UserRoleSicgem[];
}
