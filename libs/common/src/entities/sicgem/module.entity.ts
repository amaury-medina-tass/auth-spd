import { Entity, OneToMany } from "typeorm";
import { BaseModule } from "../base/base-module.entity";
import { PermissionSicgem } from "./permission.entity";

@Entity({ name: "modules", schema: "sicgem" })
export class ModuleSicgem extends BaseModule {
    @OneToMany(() => PermissionSicgem, (p) => p.module)
    permissions!: PermissionSicgem[];
}
