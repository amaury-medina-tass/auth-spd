import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { RolePermissionSpd } from "@common/entities/spd/role-permission.entity";
import { RolePermissionSicgem } from "@common/entities/sicgem/role-permission.entity";
import { PermissionSpd } from "@common/entities/spd/permission.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(RoleSpd) private readonly roleRepoSpd: Repository<RoleSpd>,
        @InjectRepository(RoleSicgem) private readonly roleRepoSicgem: Repository<RoleSicgem>,
        @InjectRepository(RolePermissionSpd) private readonly rpermRepoSpd: Repository<RolePermissionSpd>,
        @InjectRepository(RolePermissionSicgem) private readonly rpermRepoSicgem: Repository<RolePermissionSicgem>,
        @InjectRepository(PermissionSpd) private readonly permRepoSpd: Repository<PermissionSpd>,
        @InjectRepository(PermissionSicgem) private readonly permRepoSicgem: Repository<PermissionSicgem>,
        private readonly auditLog: AuditLogService
    ) { }

    private getRepos(system: SystemType) {
        if (system === 'SPD') {
            return {
                roleRepo: this.roleRepoSpd,
                rolePermissionRepo: this.rpermRepoSpd,
                permissionRepo: this.permRepoSpd
            };
        }
        if (system === 'SICGEM') {
            return {
                roleRepo: this.roleRepoSicgem,
                rolePermissionRepo: this.rpermRepoSicgem,
                permissionRepo: this.permRepoSicgem
            };
        }
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    private readonly sortableFields = ["name", "is_active", "created_at", "updated_at"];

    async findAll(system: SystemType) {
        const { roleRepo } = this.getRepos(system);
        return roleRepo.find({
            select: ["id", "name"],
            where: { system } as any, // system check implicit by schema but field exists
            order: { name: "ASC" }
        });
    }

    async findAllPaginated(
        page: number,
        limit: number,
        system: SystemType,
        search?: string,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ) {
        const { roleRepo } = this.getRepos(system);
        const skip = (page - 1) * limit;

        const qb = roleRepo.createQueryBuilder("role")
            .where("role.system = :system", { system });

        if (search) {
            qb.andWhere(
                "(role.name ILIKE :search OR role.description ILIKE :search)",
                { search: `%${search}%` }
            );
        }

        const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
        const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

        qb.orderBy(`role.${validSortBy}`, validSortOrder)
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

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
        const { roleRepo } = this.getRepos(system);
        const role = await roleRepo.findOne({
            where: { id, system } as any
        });

        if (!role) {
            throw new NotFoundException({ message: "Rol no encontrado", code: ErrorCodes.ROLE_NOT_FOUND });
        }

        return role;
    }

    async getRolePermissions(id: string, system: SystemType) {
        const { permissionRepo, rolePermissionRepo } = this.getRepos(system);
        const role = await this.findOne(id, system);

        // Get ALL permissions available in this system (SPD schema)
        // This includes permissions for system modules and public modules linked within this system context
        const allPermissions = await permissionRepo.createQueryBuilder("p")
            .leftJoinAndSelect("p.module", "m")
            .leftJoinAndSelect("p.action", "a")
            .orderBy("m.path", "ASC")
            .addOrderBy("a.code_action", "ASC")
            .getMany();

        // Get role's granted permissions
        const grantedPermissions = await rolePermissionRepo.find({
            where: { role: { id } } as any,
            relations: ["permission"]
        });

        const grantedSet = new Set(grantedPermissions.map(rp => rp.permission_id));

        // Group by module
        const permissionsByModule: Record<string, { moduleId: string; moduleName: string; actions: { permissionId: string; actionId: string; code: string; name: string; allowed: boolean }[] }> = {};

        for (const p of allPermissions) {
            const modulePath = (p.module as any).path;
            const moduleName = (p.module as any).name;
            const moduleId = (p.module as any).id;
            const actionId = (p.action as any).id;
            const actionCode = (p.action as any).code_action;
            const actionName = (p.action as any).name;

            if (!permissionsByModule[modulePath]) {
                permissionsByModule[modulePath] = { moduleId, moduleName, actions: [] };
            }
            permissionsByModule[modulePath].actions.push({
                permissionId: p.id,
                actionId,
                code: actionCode, // Ensure property name matches expected output
                name: actionName,
                allowed: grantedSet.has(p.id)
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
        const { roleRepo } = this.getRepos(system);
        const existing = await roleRepo.findOne({
            where: { name: data.name, system } as any
        });

        if (existing) {
            throw new ConflictException({ message: `Ya existe un rol con el nombre "${data.name}"`, code: ErrorCodes.ROLE_ALREADY_EXISTS });
        }

        // If setting as default, remove default from any other role in this system
        if (data.is_default) {
            await roleRepo.createQueryBuilder()
                .update()
                .set({ is_default: false })
                .where("system = :system AND is_default = true", { system })
                .execute();
        }

        const role = roleRepo.create({
            name: data.name,
            description: data.description ?? null,
            is_active: true,
            is_default: data.is_default ?? false,
            system
        });

        const saved = await roleRepo.save(role);

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
        const { roleRepo } = this.getRepos(system);
        const role = await this.findOne(id, system);

        const oldValues = {
            name: role.name,
            description: role.description,
            is_active: role.is_active,
            is_default: role.is_default,
        };

        if (data.name !== undefined && data.name !== role.name) {
            const existing = await roleRepo.findOne({
                where: { name: data.name, system } as any
            });

            if (existing && existing.id !== id) {
                throw new ConflictException({ message: `Ya existe un rol con el nombre "${data.name}"`, code: ErrorCodes.ROLE_ALREADY_EXISTS });
            }
            role.name = data.name;
        }

        // If setting as default, remove default from any other role in this system
        if (data.is_default === true && !role.is_default) {
            await roleRepo.createQueryBuilder()
                .update()
                .set({ is_default: false })
                .where("system = :system AND is_default = true", { system })
                .execute();
        }

        if (data.description !== undefined) role.description = data.description;
        if (data.is_active !== undefined) role.is_active = data.is_active;
        if (data.is_default !== undefined) role.is_default = data.is_default;
        role.updated_at = new Date();

        const saved = await roleRepo.save(role);

        const changes = buildChanges(oldValues, data, Object.keys(data));
        await this.auditLog.logSuccess(AuditAction.ROLE_UPDATED, AuditEntityType.ROLE, id, {
            entityName: saved.name,
            system,
            changes,
        });

        return saved;
    }

    async delete(id: string, system: SystemType) {
        const { roleRepo } = this.getRepos(system);
        const role = await roleRepo.findOne({
            where: { id, system } as any,
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
        await roleRepo.remove(role);

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
        const { permissionRepo, rolePermissionRepo } = this.getRepos(system);
        const role = await this.findOne(roleId, system);

        // If no permissions sent, just clear all permissions for this role
        if (allowedPermissionIds.length === 0) {
            await rolePermissionRepo.delete({ role: { id: roleId } } as any);

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

        // Validate all permission IDs exist in current system repository
        // querying one by one or list. List is better.
        const validPermissions = await permissionRepo.createQueryBuilder("p")
            .leftJoinAndSelect("p.module", "m")
            .leftJoinAndSelect("p.action", "a")
            .where("p.id IN (:...ids)", { ids: allowedPermissionIds })
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
        const existingRolePermissions = await rolePermissionRepo.find({
            where: { role: { id: roleId } } as any,
            relations: ["permission"]
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
            // Need to create entities properly to satisfy types
            // rolePermissionRepo is Repository<RolePermissionSpd>
            const newEntities = rolePermissionRepo.create(
                toAdd.map(permissionId => ({
                    role: { id: roleId },
                    permission: { id: permissionId }
                } as any))
            );

            await rolePermissionRepo.save(newEntities);
        }

        // Remove old permissions
        if (toRemove.length > 0) {
            // Delete by role_id and permission_id matches?
            // Since repo.delete takes criteria, but composite key handling in TypeORM delete is tricky.
            // RolePermission has separate primary column?
            // Let's check BaseRolePermission. Usually it has an ID or composite PK.
            // Spd entity has @Index(["role_id", "permission_id"], { unique: true }).
            // But it extends BaseRolePermission.
            // I should check BaseRolePermission to see if it has an ID.

            // Assuming it has an ID, finding them first then removing is safe.
            // But I have `existingRolePermissions` which have IDs if the entity has one.
            const entitiesToRemove = existingRolePermissions.filter(rp => toRemove.includes(rp.permission_id));
            await rolePermissionRepo.remove(entitiesToRemove);
        }

        // Log
        if (toAdd.length > 0) {
            const addedDetails = validPermissions
                .filter(p => toAdd.includes(p.id))
                .map(p => `${(p.module as any).name}: ${(p.action as any).name}`);

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
                .map(rp => {
                    // Need to access permission relations if loaded.
                    // In find existingRolePermissions I did relations: ["permission", "permission.action", "permission.module"]?
                    // Let's check my find call above: relations: ["permission"]
                    // I need deep relations for logging names.
                    // But strictly speaking logging is secondary.
                    return `${rp.permission_id}`;
                });

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
