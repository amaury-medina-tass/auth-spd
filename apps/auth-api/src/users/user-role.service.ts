import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserSpd } from "@common/entities/spd/user.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";

import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class UserRoleService {
    constructor(
        @InjectRepository(UserSpd) private userRepoSpd: Repository<UserSpd>,
        @InjectRepository(UserSicgem) private userRepoSicgem: Repository<UserSicgem>,
        @InjectRepository(UserRoleSpd) private userRoleRepoSpd: Repository<UserRoleSpd>,
        @InjectRepository(UserRoleSicgem) private userRoleRepoSicgem: Repository<UserRoleSicgem>,
        @InjectRepository(RoleSpd) private roleRepoSpd: Repository<RoleSpd>,
        @InjectRepository(RoleSicgem) private roleRepoSicgem: Repository<RoleSicgem>,
        private auditLog: AuditLogService
    ) { }

    private getUserRepo(system: SystemType): Repository<any> { // return any to allow query builder 'user_roles' access
        if (system === 'SPD') return this.userRepoSpd;
        if (system === 'SICGEM') return this.userRepoSicgem;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    private getUserRoleRepo(system: SystemType): Repository<any> {
        if (system === 'SPD') return this.userRoleRepoSpd;
        if (system === 'SICGEM') return this.userRoleRepoSicgem;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    private getRoleRepo(system: SystemType): Repository<any> {
        if (system === 'SPD') return this.roleRepoSpd;
        if (system === 'SICGEM') return this.roleRepoSicgem;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    async getUserWithRoles(userId: string, system: SystemType) {
        const repo = this.getUserRepo(system);
        const roleRepo = this.getRoleRepo(system);

        const user = await repo
            .createQueryBuilder("user")
            .innerJoin("user.user_roles", "ur")
            .innerJoin("ur.role", "role") // Schema specific relation already filters by schema
            .leftJoinAndSelect("user.user_roles", "user_roles")
            .leftJoinAndSelect("user_roles.role", "user_role")
            .where("user.id = :userId", { userId })
            .getOne();

        if (!user) {
            throw new NotFoundException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });
        }

        // Get all active roles for the system
        const allRoles = await roleRepo.find({
            where: { is_active: true }, // We are in schema specific repo, so implicit system
            select: ["id", "name"]
        });

        // Get assigned role IDs
        const assignedRoles = user.user_roles?.map((ur: any) => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || [];
        const assignedRoleIds = new Set(assignedRoles.map((r: any) => r.id));

        // Calculate missing roles
        const missingRoles = allRoles
            .filter((role: any) => !assignedRoleIds.has(role.id))
            .map((role: any) => ({ id: role.id, name: role.name }));

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            document_number: user.document_number,
            roles: assignedRoles,
            missingRoles
        };
    }

    async assignRole(userId: string, roleId: string, system: SystemType) {
        const userRepo = this.getUserRepo(system);
        const roleRepo = this.getRoleRepo(system);
        const userRoleRepo = this.getUserRoleRepo(system);

        const userInSystem = await userRepo
            .createQueryBuilder("user")
            .innerJoin("user.user_roles", "ur")
            .innerJoin("ur.role", "role") // Schema check implicitly via relation
            .where("user.id = :userId", { userId })
            .getOne();

        // Note: The logic "userInSystem" originally checked if query returned something.
        // It joined user_roles. So it asserted user has AT LEAST ONE role.
        // But what if user exists but has NO roles? (e.g. wiped manually).
        // The original code enforced innerJoin.
        // If I want to allow assigning role to a user that exists but has no roles?
        // QueryBuilder with innerJoin will fail to find user if no roles.
        // But `AuthService.register` adds a default role. So typically they have one.
        // If I want to be safe, I should just check if User exists.
        // But original logic "Usuario no encontrado EN ESTE SISTEMA" implies checking the join.
        // I will keep innerJoin logic for consistency, or maybe relax it?
        // Since schema splits users, `userRepo.findOne(id)` asserts existence in schema.
        // I'll stick to `findOne` to verify existence, unrelated to roles.
        // Original code was: `.innerJoin("ur.role", "role", "role.system = :system"...)`.
        // That filtered users who have a role in that system.
        // BUT now users are dedicated to text system.
        // So checking `userRepo.findOne` is enough.

        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
        }

        const role = await roleRepo.findOne({ where: { id: roleId } }); // Implicitly system
        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        const existingUserRole = await userRoleRepo.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (existingUserRole) {
            throw new ConflictException({ message: `El usuario ya tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_ALREADY_ASSIGNED });
        }

        const userRole = userRoleRepo.create({
            user_id: userId,
            role_id: roleId
        });

        await userRoleRepo.save(userRole);

        // Log de auditoría
        await this.auditLog.logSuccess(AuditAction.ROLE_ASSIGNED, AuditEntityType.USER_ROLE, `${userId}:${roleId}`, {
            entityName: `${user.first_name} ${user.last_name}`,
            system,
            metadata: {
                userId,
                userEmail: user.email,
                userName: `${user.first_name} ${user.last_name}`,
                roleId,
                roleName: role.name,
            }
        });

        return {
            userId,
            roleId,
            roleName: role.name,
            assignedAt: userRole.created_at
        };
    }

    async unassignRole(userId: string, roleId: string, system: SystemType) {
        const userRepo = this.getUserRepo(system);
        const roleRepo = this.getRoleRepo(system);
        const userRoleRepo = this.getUserRoleRepo(system);

        const userInSystem = await userRepo
            .createQueryBuilder("user")
            .leftJoinAndSelect("user.user_roles", "user_roles")
            .leftJoinAndSelect("user_roles.role", "user_role")
            .where("user.id = :userId", { userId })
            .getOne();

        if (!userInSystem) {
            throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
        }

        const rolesInSystem = userInSystem.user_roles || []; // In this schema, all roles are in schema
        if (rolesInSystem.length <= 1) {
            throw new ConflictException({ message: "El usuario debe tener al menos un rol en el sistema", code: ErrorCodes.CANNOT_REMOVE_LAST_ROLE });
        }

        const role = await roleRepo.findOne({ where: { id: roleId } });
        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        const existingUserRole = await userRoleRepo.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (!existingUserRole) {
            throw new NotFoundException({ message: `El usuario no tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_NOT_ASSIGNED });
        }

        await userRoleRepo.remove(existingUserRole);

        // Log de auditoría
        await this.auditLog.logSuccess(AuditAction.ROLE_UNASSIGNED, AuditEntityType.USER_ROLE, `${userId}:${roleId}`, {
            entityName: `${userInSystem.first_name} ${userInSystem.last_name}`,
            system,
            metadata: {
                userId,
                userEmail: userInSystem.email,
                userName: `${userInSystem.first_name} ${userInSystem.last_name}`,
                roleId,
                roleName: role.name,
            }
        });

        return {
            userId,
            roleId,
            roleName: role.name,
            unassignedAt: new Date()
        };
    }
}
