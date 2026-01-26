import { Entity, OneToMany } from "typeorm";
import { BaseUser } from "../base/base-user.entity";
import { UserRoleSicgem } from "./user-role.entity";
import { RefreshTokenSicgem } from "./refresh-token.entity";

@Entity({ name: "users", schema: "sicgem" })
export class UserSicgem extends BaseUser {
    @OneToMany(() => UserRoleSicgem, (ur) => ur.user)
    user_roles!: UserRoleSicgem[];

    @OneToMany(() => RefreshTokenSicgem, (rt) => rt.user)
    refresh_tokens!: RefreshTokenSicgem[];
}
