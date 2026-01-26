import { Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseUserRole } from "../base/base-user-role.entity";
import { UserSicgem } from "./user.entity";
import { RoleSicgem } from "./role.entity";

@Entity({ name: "user_roles", schema: "sicgem" })
@Index(["user_id", "role_id"], { unique: true })
export class UserRoleSicgem extends BaseUserRole {
    @ManyToOne(() => UserSicgem, (u) => u.user_roles, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: UserSicgem;

    @ManyToOne(() => RoleSicgem, (r) => r.user_roles, { onDelete: "CASCADE" })
    @JoinColumn({ name: "role_id" })
    role!: RoleSicgem;
}
