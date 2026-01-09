import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from "./user-role.entity";
import { RefreshToken } from "./refresh-token.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 50 })
  document_number!: string;

  @Column({ type: "varchar", length: 100 })
  first_name!: string;

  @Column({ type: "varchar", length: 100 })
  last_name!: string;

  @Column({ type: "text" })
  password_hash!: string;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "boolean", default: false })
  email_verified!: boolean;

  @Column({ type: "varchar", length: 6, nullable: true })
  verification_code!: string | null;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => UserRole, (ur) => ur.user)
  user_roles!: UserRole[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refresh_tokens!: RefreshToken[];
}
