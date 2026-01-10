import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "@common/entities/user-role.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { Permission } from "@common/entities/permission.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";

@Injectable()
export class PermissionsResolverService {
    constructor(
        @InjectRepository(UserRole) private urRepo: Repository<UserRole>
    ) { }

    async userHasPermission(userId: string, modulePath: string, actionName: string): Promise<boolean> {
        const rows = await this.urRepo
            .createQueryBuilder("ur")
            .innerJoin(RolePermission, "rp", "rp.role_id = ur.role_id AND rp.allowed = true")
            .innerJoin(Permission, "p", "p.id = rp.permission_id")
            .innerJoin(ModuleEntity, "m", "m.id = p.module_id AND m.path = :modulePath", { modulePath })
            .innerJoin(ActionEntity, "a", "a.id = p.action_id AND a.name = :actionName", { actionName })
            .where("ur.user_id = :userId", { userId })
            .limit(1)
            .getRawMany();

        return rows.length > 0;
    }
}
