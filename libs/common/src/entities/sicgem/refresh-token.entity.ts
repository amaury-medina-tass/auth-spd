import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseRefreshToken } from "../base/base-refresh-token.entity";
import { UserSicgem } from "./user.entity";

@Entity({ name: "refresh_tokens", schema: "sicgem" })
export class RefreshTokenSicgem extends BaseRefreshToken {
    @ManyToOne(() => UserSicgem, (u) => u.refresh_tokens, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: UserSicgem;
}
