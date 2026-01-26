import { Entity, OneToMany } from "typeorm";
import { BaseAction } from "../base/base-action.entity";
import { PermissionSpd } from "./permission.entity";

@Entity({ name: "actions", schema: "spd" })
export class ActionSpd extends BaseAction {
    @OneToMany(() => PermissionSpd, (p) => p.action)
    permissions!: PermissionSpd[];
}
