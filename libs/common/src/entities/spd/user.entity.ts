import { Entity, OneToMany } from "typeorm";
import { BaseUser } from "../base/base-user.entity";
import { UserRoleSpd } from "./user-role.entity";
import { RefreshTokenSpd } from "./refresh-token.entity";

@Entity({ name: "users", schema: "spd" })
export class UserSpd extends BaseUser {
    @OneToMany(() => UserRoleSpd, (ur) => ur.user)
    user_roles!: UserRoleSpd[];

    @OneToMany(() => RefreshTokenSpd, (rt) => rt.user)
    refresh_tokens!: RefreshTokenSpd[];
}
