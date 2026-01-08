import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ModuleEntity } from "./module.entity";
import { ActionEntity } from "./action.entity";
import { RolePermission } from "./role-permission.entity";

@Entity({ name: "permissions" })
@Index(["module_id", "action_id"], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  module_id!: string;

  @Column({ type: "uuid" })
  action_id!: string;

  @ManyToOne(() => ModuleEntity, (m) => m.permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "module_id" })
  module!: ModuleEntity;

  @ManyToOne(() => ActionEntity, (a) => a.permissions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "action_id" })
  action!: ActionEntity;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  role_permissions!: RolePermission[];
}