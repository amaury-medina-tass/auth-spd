import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: "refresh_tokens" })
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "text" })
  token_hash!: string;

  @Column({ type: "boolean", default: false })
  revoked!: boolean;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @ManyToOne(() => User, (u) => u.refresh_tokens, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}