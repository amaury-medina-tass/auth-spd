import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SystemType } from "@common/types/system";

import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";

@Injectable()
export class PermissionsResolverService {
    constructor(
        @InjectRepository(UserRoleSpd) private urRepoSpd: Repository<UserRoleSpd>,
        @InjectRepository(UserRoleSicgem) private urRepoSicgem: Repository<UserRoleSicgem>
    ) { }

    private getRepo(system: SystemType): Repository<any> {
        if (system === 'SPD') return this.urRepoSpd;
        if (system === 'SICGEM') return this.urRepoSicgem;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    async hasActiveRoleInSystem(userId: string, system: SystemType): Promise<boolean> {
        const repo = this.getRepo(system);

        // Check if user has any active role assignment
        // Since UserRole table is specific to system, strict existence is enough?
        // But we should check if the role itself is active.
        const count = await repo
            .createQueryBuilder("ur")
            .innerJoin("ur.role", "r") // RoleSpd/Sicgem
            .where("ur.user_id = :userId", { userId })
            .andWhere("r.is_active = true")
            // System check on role is redundant as repo is schema specific
            .getCount();

        return count > 0;
    }

    async userHasPermission(userId: string, modulePath: string, actionCode: string, system: SystemType): Promise<boolean> {
        const repo = this.getRepo(system);

        const count = await repo
            .createQueryBuilder("ur")
            .innerJoin("ur.role", "r")
            .innerJoin("r.role_permissions", "rp")
            .innerJoin("rp.permission", "p")
            .innerJoin("p.module", "m")
            .innerJoin("p.action", "a")
            .where("ur.user_id = :userId", { userId })
            .andWhere("r.is_active = true")
            // RolePermission must be allowed (it has 'allowed' boolean or just existence?)
            // BaseRolePermission has 'allowed' column, default true.
            // But usually we only store allowed=true? Or strict denials?
            // If 'allowed' is a boolean, we should check it.
            .andWhere("rp.allowed = true")
            .andWhere("m.path = :modulePath", { modulePath })
            .andWhere("a.code_action = :actionCode", { actionCode })
            // Module/Action system check: 
            // Since we are in schema specific repos, we are looking at S/M/A in that schema.
            // If checking PUBLIC modules, they must be linked via permissions in this schema.
            // My ModulesService permissions logic stores permissions in 'spd.permissions' even if module is PUBLIC.
            // So querying the schema-specific permission table is correct.
            .getCount();

        return count > 0;
    }
}
