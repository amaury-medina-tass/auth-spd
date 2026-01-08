import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { UserRole } from "./user-role.entity";

@Entity({ name: "roles" })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "boolean", default: false })
  is_default!: boolean;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  role_permissions!: RolePermission[];

  @OneToMany(() => UserRole, (ur) => ur.role)
  user_roles!: UserRole[];
}