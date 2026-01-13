import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, In } from "typeorm";
import { Role } from "@common/entities/role.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { Permission } from "@common/entities/permission.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Role) private repo: Repository<Role>,
        @InjectRepository(RolePermission) private rolePermissionRepo: Repository<RolePermission>,
        @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
        private auditLog: AuditLogService
    ) { }

    private readonly sortableFields = ["name", "is_active", "created_at", "updated_at"];

    async findAll(system: SystemType) {
        return this.repo.find({
            select: ["id", "name"],
            where: { system },
            order: { name: "ASC" }
        });
    }

    async findAllPaginated(
        page: number = 1,
        limit: number = 10,
        system: SystemType,
        search?: string,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ) {
        const skip = (page - 1) * limit;

        let whereCondition: any = { system };

        if (search) {
            whereCondition = [
                { name: ILike(`%${search}%`), system },
                { description: ILike(`%${search}%`), system }
            ];
        }

        const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
        const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

        const [data, total] = await this.repo.findAndCount({
            select: ["id", "name", "description", "is_active", "is_default", "created_at", "updated_at"],
            where: whereCondition,
            skip,
            take: limit,
            order: { [validSortBy]: validSortOrder }
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }

    async findOne(id: string, system: SystemType) {
        const role = await this.repo.findOne({
            where: { id, system }
        });

        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        return role;
    }

    async getRolePermissions(id: string, system: SystemType) {
        const role = await this.findOne(id, system);

        // Get ALL modules (PUBLIC + system-specific) with their permissions
        const allModuleActions = await this.repo.manager.query<{
            module_id: string;
            module_path: string;
            module_name: string;
            permission_id: string;
            action_id: string;
            action_code: string;
            action_name: string;
        }[]>(
            `
      SELECT DISTINCT 
        m.id AS module_id,
        m.path AS module_path,
        m.name AS module_name,
        p.id AS permission_id,
        a.id AS action_id,
        a.code_action AS action_code,
        a.name AS action_name
      FROM permissions p
      JOIN modules m ON m.id = p.module_id AND (m.system = 'PUBLIC' OR m.system = $1::modules_system_enum)
      JOIN actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $2::actions_system_enum)
      ORDER BY m.path, a.code_action
      `,
            [system, system]
        );

        // Get role's granted permissions
        const grantedPermissions = await this.repo.manager.query<{
            permission_id: string;
            allowed: boolean;
        }[]>(
            `
      SELECT 
        rp.permission_id,
        rp.allowed
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      JOIN modules m ON m.id = p.module_id
      JOIN actions a ON a.id = p.action_id
      WHERE rp.role_id = $1
      `,
            [id]
        );

        // Build a set of granted permissions by permission_id
        const grantedSet = new Map<string, boolean>();
        for (const gp of grantedPermissions) {
            grantedSet.set(gp.permission_id, gp.allowed);
        }

        // Group all actions by module, marking allowed status
        const permissionsByModule: Record<string, { moduleId: string; moduleName: string; actions: { permissionId: string; actionId: string; code: string; name: string; allowed: boolean }[] }> = {};

        for (const action of allModuleActions) {
            if (!permissionsByModule[action.module_path]) {
                permissionsByModule[action.module_path] = { moduleId: action.module_id, moduleName: action.module_name, actions: [] };
            }
            permissionsByModule[action.module_path].actions.push({
                permissionId: action.permission_id,
                actionId: action.action_id,
                code: action.action_code,
                name: action.action_name,
                allowed: grantedSet.get(action.permission_id) ?? false
            });
        }

        return {
            role: {
                id: role.id,
                name: role.name
            },
            permissions: permissionsByModule
        };
    }

    async create(data: { name: string; description?: string; is_default?: boolean }, system: SystemType) {
        const existing = await this.repo.findOne({
            where: { name: data.name, system }
        });

        if (existing) {
            throw new ConflictException({ message: `Ya existe un rol con el nombre "${data.name}"`, code: ErrorCodes.ROLE_ALREADY_EXISTS });
        }

        // If setting as default, remove default from any other role in this system
        if (data.is_default) {
            await this.repo.update(
                { system, is_default: true },
                { is_default: false, updated_at: new Date() }
            );
        }

        const role = this.repo.create({
            name: data.name,
            description: data.description ?? null,
            is_active: true,
            is_default: data.is_default ?? false,
            system
        });

        const saved = await this.repo.save(role);

        await this.auditLog.logSuccess(AuditAction.ROLE_CREATED, AuditEntityType.ROLE, saved.id, {
            entityName: saved.name,
            system,
            metadata: {
                name: saved.name,
                description: saved.description,
                is_default: saved.is_default,
            }
        });

        return saved;
    }

    async update(id: string, system: SystemType, data: { name?: string; description?: string; is_active?: boolean; is_default?: boolean }) {
        const role = await this.repo.findOne({
            where: { id, system }
        });

        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        const oldValues = {
            name: role.name,
            description: role.description,
            is_active: role.is_active,
            is_default: role.is_default,
        };

        if (data.name !== undefined && data.name !== role.name) {
            const existing = await this.repo.findOne({
                where: { name: data.name, system }
            });

            if (existing && existing.id !== id) {
                throw new ConflictException({ message: `Ya existe un rol con el nombre "${data.name}"`, code: ErrorCodes.ROLE_ALREADY_EXISTS });
            }
            role.name = data.name;
        }

        // If setting as default, remove default from any other role in this system
        if (data.is_default === true && !role.is_default) {
            await this.repo.update(
                { system, is_default: true },
                { is_default: false, updated_at: new Date() }
            );
        }

        if (data.description !== undefined) role.description = data.description;
        if (data.is_active !== undefined) role.is_active = data.is_active;
        if (data.is_default !== undefined) role.is_default = data.is_default;
        role.updated_at = new Date();

        const saved = await this.repo.save(role);

        const changes = buildChanges(oldValues, data, Object.keys(data));
        await this.auditLog.logSuccess(AuditAction.ROLE_UPDATED, AuditEntityType.ROLE, id, {
            entityName: saved.name,
            system,
            changes,
        });

        return saved;
    }

    async delete(id: string, system: SystemType) {
        const role = await this.repo.findOne({
            where: { id, system },
            relations: ["user_roles"]
        });

        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        if (role.user_roles && role.user_roles.length > 0) {
            throw new ConflictException({
                message: `No se puede eliminar el rol "${role.name}" porque tiene ${role.user_roles.length} usuario(s) asignado(s)`,
                code: ErrorCodes.ROLE_HAS_USERS
            });
        }

        const roleName = role.name;
        await this.repo.remove(role);

        await this.auditLog.logSuccess(AuditAction.ROLE_DELETED, AuditEntityType.ROLE, id, {
            entityName: roleName,
            system,
            metadata: { name: roleName }
        });

        return {
            id,
            name: roleName,
            deletedAt: new Date()
        };
    }

    async updateRolePermissions(
        roleId: string,
        system: SystemType,
        allowedPermissionIds: string[]
    ) {
        const role = await this.findOne(roleId, system);

        // If no permissions sent, just clear all permissions for this role
        if (allowedPermissionIds.length === 0) {
            await this.rolePermissionRepo.delete({ role_id: roleId });

            await this.auditLog.logSuccess(AuditAction.PERMISSION_REVOKED, AuditEntityType.ROLE_PERMISSIONS, roleId, {
                entityName: `${role.name} - Todos los permisos`,
                system,
                metadata: { action: "clear_all", roleName: role.name }
            });

            return {
                roleId: role.id,
                roleName: role.name,
                added: 0,
                removed: 0,
                total: 0
            };
        }

        // Validate all permission IDs exist and belong to the correct system
        const validPermissions = await this.permissionRepo
            .createQueryBuilder("p")
            .innerJoinAndSelect("p.module", "m")
            .innerJoinAndSelect("p.action", "a")
            .where("p.id IN (:...ids)", { ids: allowedPermissionIds })
            .andWhere("(m.system = 'PUBLIC' OR m.system = :moduleSystem::modules_system_enum)", { moduleSystem: system })
            .andWhere("(a.system = 'PUBLIC' OR a.system = :actionSystem::actions_system_enum)", { actionSystem: system })
            .getMany();

        const validPermissionIds = new Set(validPermissions.map(p => p.id));
        const invalidIds = allowedPermissionIds.filter(id => !validPermissionIds.has(id));

        if (invalidIds.length > 0) {
            throw new NotFoundException({
                message: `Permisos no encontrados: ${invalidIds.join(", ")}`,
                code: ErrorCodes.PERMISSION_NOT_FOUND
            });
        }

        // Get existing role permissions
        const existingRolePermissions = await this.rolePermissionRepo.find({
            where: { role_id: roleId },
            relations: ["permission", "permission.action", "permission.module"]
        });

        const existingPermissionIds = new Set(existingRolePermissions.map(rp => rp.permission_id));
        const newPermissionIds = new Set(allowedPermissionIds);

        // Permissions to add (in newPermissionIds but not in existingPermissionIds)
        const toAdd = allowedPermissionIds.filter(id => !existingPermissionIds.has(id));

        // Permissions to remove (in existingPermissionIds but not in newPermissionIds)
        const toRemove = existingRolePermissions
            .filter(rp => !newPermissionIds.has(rp.permission_id))
            .map(rp => rp.permission_id);

        // Insert new permissions
        if (toAdd.length > 0) {
            await this.rolePermissionRepo.insert(
                toAdd.map(permissionId => ({
                    role_id: roleId,
                    permission_id: permissionId,
                    allowed: true
                }))
            );
        }

        // Remove old permissions
        if (toRemove.length > 0) {
            await this.rolePermissionRepo.delete({
                role_id: roleId,
                permission_id: In(toRemove)
            });
        }

        // Log the permission changes
        // Log the permission changes
        if (toAdd.length > 0) {
            const addedDetails = validPermissions
                .filter(p => toAdd.includes(p.id))
                .map(p => `${p.module.name}: ${p.action.name}`);

            await this.auditLog.logSuccess(AuditAction.PERMISSION_GRANTED, AuditEntityType.ROLE_PERMISSIONS, roleId, {
                entityName: role.name,
                system,
                metadata: {
                    roleName: role.name,
                    added: toAdd.length,
                    total: allowedPermissionIds.length,
                    addedIds: addedDetails,
                }
            });
        }

        if (toRemove.length > 0) {
            const removedDetails = existingRolePermissions
                .filter(rp => toRemove.includes(rp.permission_id))
                .map(rp => `${rp.permission.module.name}: ${rp.permission.action.name}`);

            await this.auditLog.logSuccess(AuditAction.PERMISSION_REVOKED, AuditEntityType.ROLE_PERMISSIONS, roleId, {
                entityName: role.name,
                system,
                metadata: {
                    roleName: role.name,
                    removed: toRemove.length,
                    total: allowedPermissionIds.length,
                    removedIds: removedDetails,
                }
            });
        }

        return {
            roleId: role.id,
            roleName: role.name,
            added: toAdd.length,
            removed: toRemove.length,
            total: allowedPermissionIds.length
        };
    }
}
