import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";

@Injectable()
export class UserRoleService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
        @InjectRepository(Role) private roleRepo: Repository<Role>
    ) { }

    async getUserWithRoles(userId: string, system: SystemType) {
        const user = await this.userRepo
            .createQueryBuilder("user")
            .innerJoin("user.user_roles", "ur")
            .innerJoin("ur.role", "role", "role.system = :system", { system })
            .leftJoinAndSelect("user.user_roles", "user_roles")
            .leftJoinAndSelect("user_roles.role", "user_role")
            .where("user.id = :userId", { userId })
            .getOne();

        if (!user) {
            throw new NotFoundException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });
        }

        // Get all active roles for the system
        const allRoles = await this.roleRepo.find({
            where: { system, is_active: true },
            select: ["id", "name"]
        });

        // Get assigned role IDs
        const assignedRoles = user.user_roles?.map(ur => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || [];
        const assignedRoleIds = new Set(assignedRoles.map(r => r!.id));

        // Calculate missing roles
        const missingRoles = allRoles
            .filter(role => !assignedRoleIds.has(role.id))
            .map(role => ({ id: role.id, name: role.name }));

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
        const userInSystem = await this.userRepo
            .createQueryBuilder("user")
            .innerJoin("user.user_roles", "ur")
            .innerJoin("ur.role", "role", "role.system = :system", { system })
            .where("user.id = :userId", { userId })
            .getOne();

        if (!userInSystem) {
            throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
        }

        const role = await this.roleRepo.findOne({ where: { id: roleId, system } });
        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        const existingUserRole = await this.userRoleRepo.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (existingUserRole) {
            throw new ConflictException({ message: `El usuario ya tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_ALREADY_ASSIGNED });
        }

        const userRole = this.userRoleRepo.create({
            user_id: userId,
            role_id: roleId
        });

        await this.userRoleRepo.save(userRole);

        return {
            userId,
            roleId,
            roleName: role.name,
            assignedAt: userRole.created_at
        };
    }

    async unassignRole(userId: string, roleId: string, system: SystemType) {
        const userInSystem = await this.userRepo
            .createQueryBuilder("user")
            .innerJoin("user.user_roles", "ur")
            .innerJoin("ur.role", "role", "role.system = :system", { system })
            .leftJoinAndSelect("user.user_roles", "user_roles")
            .leftJoinAndSelect("user_roles.role", "user_role", "user_role.system = :system", { system })
            .where("user.id = :userId", { userId })
            .getOne();

        if (!userInSystem) {
            throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
        }

        const rolesInSystem = userInSystem.user_roles?.filter(ur => ur.role?.system === system) || [];
        if (rolesInSystem.length <= 1) {
            throw new ConflictException({ message: "El usuario debe tener al menos un rol en el sistema", code: ErrorCodes.CANNOT_REMOVE_LAST_ROLE });
        }

        const role = await this.roleRepo.findOne({ where: { id: roleId, system } });
        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        const existingUserRole = await this.userRoleRepo.findOne({
            where: { user_id: userId, role_id: roleId }
        });
        if (!existingUserRole) {
            throw new NotFoundException({ message: `El usuario no tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_NOT_ASSIGNED });
        }

        await this.userRoleRepo.remove(existingUserRole);

        return {
            userId,
            roleId,
            roleName: role.name,
            unassignedAt: new Date()
        };
    }
}
