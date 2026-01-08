import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Permission } from "./permission.entity";

@Entity({ name: "actions" })
export class ActionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 50 })
  name!: string; // READ, CREATE, UPDATE, DELETE

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "timestamp", default: () => "now()" })
  created_at!: Date;

  @Column({ type: "timestamp", default: () => "now()" })
  updated_at!: Date;

  @OneToMany(() => Permission, (p) => p.action)
  permissions!: Permission[];
}