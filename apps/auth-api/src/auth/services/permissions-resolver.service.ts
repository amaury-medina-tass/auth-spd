import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserRole } from "@common/entities/user-role.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { Permission } from "@common/entities/permission.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { Role } from "@common/entities/role.entity";
import { SystemType } from "@common/types/system";

@Injectable()
export class PermissionsResolverService {
    constructor(
        @InjectRepository(UserRole) private urRepo: Repository<UserRole>
    ) { }

    async hasActiveRoleInSystem(userId: string, system: SystemType): Promise<boolean> {
        const count = await this.urRepo
            .createQueryBuilder("ur")
            .innerJoin(Role, "r", "r.id = ur.role_id AND r.is_active = true AND r.system = :roleSystem::roles_system_enum", { roleSystem: system })
            .where("ur.user_id = :userId", { userId })
            .getCount();

        return count > 0;
    }

    async userHasPermission(userId: string, modulePath: string, actionCode: string, system: SystemType): Promise<boolean> {
        const rows = await this.urRepo
            .createQueryBuilder("ur")
            .innerJoin(Role, "r", "r.id = ur.role_id AND r.is_active = true AND r.system = :roleSystem::roles_system_enum", { roleSystem: system })
            .innerJoin(RolePermission, "rp", "rp.role_id = ur.role_id AND rp.allowed = true")
            .innerJoin(Permission, "p", "p.id = rp.permission_id")
            .innerJoin(ModuleEntity, "m", "m.id = p.module_id AND m.path = :modulePath AND (m.system = 'PUBLIC' OR m.system = :moduleSystem::modules_system_enum)", { modulePath, moduleSystem: system })
            .innerJoin(ActionEntity, "a", "a.id = p.action_id AND a.code_action = :actionCode AND (a.system = 'PUBLIC' OR a.system = :actionSystem::actions_system_enum)", { actionCode, actionSystem: system })
            .where("ur.user_id = :userId", { userId })
            .limit(1)
            .getRawMany();

        return rows.length > 0;
    }
}
