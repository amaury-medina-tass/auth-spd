import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModuleSpd } from "@common/entities/spd/module.entity";
import { ModuleSicgem } from "@common/entities/sicgem/module.entity";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { PermissionSpd } from "@common/entities/spd/permission.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class ModulesService {
    constructor(
        @InjectRepository(ModuleSpd) private readonly moduleRepoSpd: Repository<ModuleSpd>,
        @InjectRepository(ModuleSicgem) private readonly moduleRepoSicgem: Repository<ModuleSicgem>,
        @InjectRepository(ActionSpd) private readonly actionRepoSpd: Repository<ActionSpd>,
        @InjectRepository(ActionSicgem) private readonly actionRepoSicgem: Repository<ActionSicgem>,
        @InjectRepository(PermissionSpd) private readonly permissionRepoSpd: Repository<PermissionSpd>,
        @InjectRepository(PermissionSicgem) private readonly permissionRepoSicgem: Repository<PermissionSicgem>,
        private readonly auditLog: AuditLogService
    ) { }

    private getRepos(system: SystemType) {
        if (system === 'SPD') {
            return {
                moduleRepo: this.moduleRepoSpd,
                actionRepo: this.actionRepoSpd,
                permissionRepo: this.permissionRepoSpd
            };
        }
        if (system === 'SICGEM') {
            return {
                moduleRepo: this.moduleRepoSicgem,
                actionRepo: this.actionRepoSicgem,
                permissionRepo: this.permissionRepoSicgem
            };
        }
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    private readonly sortableFields = ["name", "path", "created_at"];

    async findAll(system: SystemType) {
        const { moduleRepo } = this.getRepos(system);
        return moduleRepo
            .createQueryBuilder("module")
            .select(["module.id", "module.name", "module.path"])
            .where("module.system = 'PUBLIC' OR module.system = :system", { system })
            .orderBy("module.path", "ASC")
            .getMany();
    }

    async findAllPaginated(
        page: number,
        limit: number,
        system: SystemType,
        search?: string,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ) {
        const { moduleRepo } = this.getRepos(system);
        const skip = (page - 1) * limit;

        let qb = moduleRepo.createQueryBuilder("module")
            .where("(module.system = 'PUBLIC' OR module.system = :system)", { system });

        if (search) {
            qb = qb.andWhere("(module.name ILIKE :search OR module.path ILIKE :search)", { search: `%${search}%` });
        }

        const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
        const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

        qb = qb.orderBy(`module.${validSortBy}`, validSortOrder)
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map((m: any) => ({
                id: m.id,
                name: m.name,
                path: m.path,
                description: m.description,
                created_at: m.created_at,
                updated_at: m.updated_at
            })),
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
        const { moduleRepo } = this.getRepos(system);
        const module = await moduleRepo
            .createQueryBuilder("module")
            .where("module.id = :id", { id })
            .andWhere("(module.system = 'PUBLIC' OR module.system = :system)", { system })
            .getOne();

        if (!module) {
            throw new NotFoundException({ message: "Módulo no encontrado", code: ErrorCodes.MODULE_NOT_FOUND });
        }

        return module;
    }

    async create(data: { name: string; path: string; description?: string }, system: SystemType) {
        const { moduleRepo } = this.getRepos(system);
        const existingByPath = await moduleRepo.findOne({ where: { path: data.path, system } });
        if (existingByPath) {
            throw new ConflictException({ message: "Ya existe un módulo con ese path", code: ErrorCodes.MODULE_ALREADY_EXISTS });
        }

        const module = moduleRepo.create({
            name: data.name,
            path: data.path,
            description: data.description ?? null,
            system
        });

        const saved = await moduleRepo.save(module);

        await this.auditLog.logSuccess(AuditAction.MODULE_CREATED, AuditEntityType.MODULE, saved.id, {
            entityName: saved.name,
            system,
            metadata: { name: saved.name, path: saved.path }
        });

        return saved;
    }

    async update(id: string, system: SystemType, data: { name?: string; description?: string; path?: string }) {
        const { moduleRepo } = this.getRepos(system);
        const module = await this.findOne(id, system);

        if (module.system === "PUBLIC") {
            throw new ForbiddenException({ message: "No se puede modificar un módulo PUBLIC", code: ErrorCodes.MODULE_PUBLIC_CANNOT_MODIFY });
        }

        const oldValues = { name: module.name, description: module.description, path: module.path };

        if (data.path !== undefined && data.path !== module.path) {
            // Check if new path already exists
            const existingByPath = await moduleRepo.findOne({ where: { path: data.path, system: module.system } });
            if (existingByPath && existingByPath.id !== id) {
                throw new ConflictException({ message: "Ya existe un módulo con ese path", code: ErrorCodes.MODULE_ALREADY_EXISTS });
            }
            module.path = data.path;
        }

        if (data.name !== undefined) module.name = data.name;
        if (data.description !== undefined) module.description = data.description;
        module.updated_at = new Date();

        const saved = await moduleRepo.save(module);

        const changes = buildChanges(oldValues, data, Object.keys(data));
        await this.auditLog.logSuccess(AuditAction.MODULE_UPDATED, AuditEntityType.MODULE, id, {
            entityName: saved.name,
            system,
            changes,
        });

        return saved;
    }

    async delete(id: string, system: SystemType) {
        const { moduleRepo } = this.getRepos(system);
        const module = await this.findOne(id, system);

        if (module.system === "PUBLIC") {
            throw new ForbiddenException({ message: "No se puede eliminar un módulo PUBLIC", code: ErrorCodes.MODULE_PUBLIC_CANNOT_DELETE });
        }

        const moduleName = module.name;
        const modulePath = module.path;
        await moduleRepo.remove(module);

        await this.auditLog.logSuccess(AuditAction.MODULE_DELETED, AuditEntityType.MODULE, id, {
            entityName: moduleName,
            system,
            metadata: { name: moduleName, path: modulePath }
        });

        return { id, path: modulePath, deletedAt: new Date() };
    }

    async getModuleWithActions(id: string, system: SystemType) {
        const { actionRepo, permissionRepo } = this.getRepos(system);
        const module = await this.findOne(id, system);

        // Get all available actions for this system (PUBLIC + system-specific)
        const allActions = await actionRepo
            .createQueryBuilder("action")
            .where("action.system = 'PUBLIC' OR action.system = :system", { system })
            .orderBy("action.code_action", "ASC")
            .getMany();

        // Get actions already assigned to this module (permissions)
        const assignedPermissions = await permissionRepo
            .createQueryBuilder("p")
            .innerJoinAndSelect("p.action", "action")
            .where("p.module_id = :moduleId", { moduleId: id })
            .andWhere("(action.system = 'PUBLIC' OR action.system = :system)", { system }) // Ensure joined action respects system visible
            .getMany();

        const assignedActions = assignedPermissions.map((p: any) => ({
            id: p.action.id,
            code: p.action.code_action,
            name: p.action.name,
            permissionId: p.id
        }));

        const assignedActionIds = new Set(assignedActions.map(a => a.id));

        // Calculate missing actions
        const missingActions = allActions
            .filter(action => !assignedActionIds.has(action.id))
            .map(action => ({
                id: action.id,
                code: action.code_action,
                name: action.name
            }));

        return {
            id: module.id,
            name: module.name,
            path: module.path,
            description: module.description,
            actions: assignedActions,
            missingActions
        };
    }

    async addActionToModule(moduleId: string, actionId: string, system: SystemType) {
        const { actionRepo, permissionRepo } = this.getRepos(system);
        const module = await this.findOne(moduleId, system);

        // Verify the action exists and belongs to PUBLIC or the same system
        const action = await actionRepo
            .createQueryBuilder("action")
            .where("action.id = :actionId", { actionId })
            .andWhere("(action.system = 'PUBLIC' OR action.system = :system)", { system })
            .getOne();

        if (!action) {
            throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
        }

        // Check if permission already exists
        const existingPermission = await permissionRepo.findOne({
            where: { module: { id: moduleId }, action: { id: actionId } }
        });

        if (existingPermission) {
            throw new ConflictException({ message: "Esta acción ya está asignada al módulo", code: ErrorCodes.PERMISSION_ALREADY_EXISTS });
        }

        // Create permission
        // Using "any" cast to bypass strict typing of relations if necessary, or constructs strict object
        // Since we are inside specific repo context, TS knows permissionRepo is Repository<PermissionSpd> or Sicgem
        // But create() expects DeepPartial<PermissionSpd>.
        // { module: { id: ... }, action: { id: ... } } works if relations are defined in entity.
        // I will use "as any" to simplify if types mismatch slightly on base entity inheritance but structured object is correct.
        const permission: any = permissionRepo.create({
            module: { id: moduleId },
            action: { id: actionId }
        } as any);

        const savedPermission = await permissionRepo.save(permission);

        await this.auditLog.logSuccess(AuditAction.PERMISSION_GRANTED, AuditEntityType.PERMISSION, savedPermission.id, {
            entityName: module.name,
            system,
            metadata: {
                moduleId, moduleName: module.name, modulePath: module.path,
                actionId, actionCode: action.code_action, actionName: action.name,
            }
        });

        return {
            permissionId: savedPermission.id,
            module: {
                id: module.id,
                name: module.name,
                path: module.path
            },
            action: {
                id: action.id,
                code: action.code_action,
                name: action.name
            }
        };
    }

    async removeActionFromModule(moduleId: string, actionId: string, system: SystemType) {
        const { permissionRepo } = this.getRepos(system);
        const module = await this.findOne(moduleId, system);

        const permission = await permissionRepo.findOne({
            where: { module: { id: moduleId }, action: { id: actionId } },
            relations: ["action"]
        });

        if (!permission) {
            throw new NotFoundException({ message: "Permiso no encontrado", code: ErrorCodes.PERMISSION_NOT_FOUND });
        }

        const actionName = (permission as any).action?.name;
        const actionCode = (permission as any).action?.code_action;
        await permissionRepo.remove(permission);

        await this.auditLog.logSuccess(AuditAction.PERMISSION_REVOKED, AuditEntityType.PERMISSION, `${moduleId}:${actionId}`, {
            entityName: module.name,
            system,
            metadata: { moduleId, moduleName: module.name, actionId, actionCode, actionName }
        });

        return {
            moduleId,
            actionId,
            deletedAt: new Date()
        };
    }
}
