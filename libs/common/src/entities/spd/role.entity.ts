import { Entity, OneToMany } from "typeorm";
import { BaseRole } from "../base/base-role.entity";
import { UserRoleSpd } from "./user-role.entity";
import { RolePermissionSpd } from "./role-permission.entity";

@Entity({ name: "roles", schema: "spd" })
export class RoleSpd extends BaseRole {
    @OneToMany(() => RolePermissionSpd, (rp) => rp.role)
    role_permissions!: RolePermissionSpd[];

    @OneToMany(() => UserRoleSpd, (ur) => ur.role)
    user_roles!: UserRoleSpd[];
}
