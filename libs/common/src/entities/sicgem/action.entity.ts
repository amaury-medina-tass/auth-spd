import { Entity, OneToMany } from "typeorm";
import { BaseAction } from "../base/base-action.entity";
import { PermissionSicgem } from "./permission.entity";

@Entity({ name: "actions", schema: "sicgem" })
export class ActionSicgem extends BaseAction {
    @OneToMany(() => PermissionSicgem, (p) => p.action)
    permissions!: PermissionSicgem[];
}
