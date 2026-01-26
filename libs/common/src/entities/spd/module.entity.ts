import { Entity, OneToMany } from "typeorm";
import { BaseModule } from "../base/base-module.entity";
import { PermissionSpd } from "./permission.entity";

@Entity({ name: "modules", schema: "spd" })
export class ModuleSpd extends BaseModule {
    @OneToMany(() => PermissionSpd, (p) => p.module)
    permissions!: PermissionSpd[];
}
