import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Permission } from "./permission.entity";

@Entity({ name: "actions" })
@Index(["code_action", "system"], { unique: true })
export class ActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  code_action!: string; // READ, CREATE, UPDATE, DELETE, ASSIGN_ROLE

  @Column({ type: "varchar", length: 100 })
  name!: string; // Leer, Crear, Actualizar, Eliminar, Asignar Rol

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: ["PUBLIC", "DAGRD", "SICGEM"], default: "PUBLIC" })
  system!: "PUBLIC" | "DAGRD" | "SICGEM";

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => Permission, (p) => p.action)
  permissions!: Permission[];
}

