import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Role } from "./role.entity";
import { Permission } from "./permission.entity";

@Entity({ name: "role_permissions" })
@Index(["role_id", "permission_id"], { unique: true })
export class RolePermission {
  @Column({ type: "uuid", primary: true })
  role_id!: string;

  @Column({ type: "uuid", primary: true })
  permission_id!: string;

  @Column({ type: "boolean", default: true })
  allowed!: boolean;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @ManyToOne(() => Role, (r) => r.role_permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role!: Role;

  @ManyToOne(() => Permission, (p) => p.role_permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "permission_id" })
  permission!: Permission;
}