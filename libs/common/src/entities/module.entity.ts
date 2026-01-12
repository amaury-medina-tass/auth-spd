import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Permission } from "./permission.entity";

@Entity({ name: "modules" })
export class ModuleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 200 })
  path!: string;

  @Column({ type: "enum", enum: ["PUBLIC", "DAGRD", "SICGEM"], default: "PUBLIC" })
  system!: "PUBLIC" | "DAGRD" | "SICGEM";

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => Permission, (p) => p.module)
  permissions!: Permission[];
}