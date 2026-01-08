import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./user.entity";
import { Role } from "./role.entity";

@Entity({ name: "user_roles" })
@Index(["user_id", "role_id"], { unique: true })
export class UserRole {
  @Column({ type: "uuid", primary: true })
  user_id!: string;

  @Column({ type: "uuid", primary: true })
  role_id!: string;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @ManyToOne(() => User, (u) => u.user_roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Role, (r) => r.user_roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;
}