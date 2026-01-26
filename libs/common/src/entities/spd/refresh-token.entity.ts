import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseRefreshToken } from "../base/base-refresh-token.entity";
import { UserSpd } from "./user.entity";

@Entity({ name: "refresh_tokens", schema: "spd" })
export class RefreshTokenSpd extends BaseRefreshToken {
    @ManyToOne(() => UserSpd, (u) => u.refresh_tokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: UserSpd;
}
