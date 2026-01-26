import { Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseUserRole } from "../base/base-user-role.entity";
import { UserSpd } from "./user.entity";
import { RoleSpd } from "./role.entity";

@Entity({ name: "user_roles", schema: "spd" })
@Index(["user_id", "role_id"], { unique: true })
export class UserRoleSpd extends BaseUserRole {
    @ManyToOne(() => UserSpd, (u) => u.user_roles, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: UserSpd;

    @ManyToOne(() => RoleSpd, (r) => r.user_roles, { onDelete: "CASCADE" })
    @JoinColumn({ name: "role_id" })
    role!: RoleSpd;
}
