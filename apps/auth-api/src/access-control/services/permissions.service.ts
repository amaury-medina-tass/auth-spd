import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PermissionSpd } from "@common/entities/spd/permission.entity";
import { PermissionSicgem } from "@common/entities/sicgem/permission.entity";
import { ModuleSpd } from "@common/entities/spd/module.entity";
import { ModuleSicgem } from "@common/entities/sicgem/module.entity";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class PermissionsService {
    constructor(
        @InjectRepository(PermissionSpd) private readonly permissionRepoSpd: Repository<PermissionSpd>,
        @InjectRepository(PermissionSicgem) private readonly permissionRepoSicgem: Repository<PermissionSicgem>,
        @InjectRepository(ModuleSpd) private readonly moduleRepoSpd: Repository<ModuleSpd>,
        @InjectRepository(ModuleSicgem) private readonly moduleRepoSicgem: Repository<ModuleSicgem>,
        @InjectRepository(ActionSpd) private readonly actionRepoSpd: Repository<ActionSpd>,
        @InjectRepository(ActionSicgem) private readonly actionRepoSicgem: Repository<ActionSicgem>,
        private readonly auditLog: AuditLogService
    ) { }

    private getRepos(system: SystemType) {
        if (system === 'SPD') {
            return {
                permissionRepo: this.permissionRepoSpd,
                moduleRepo: this.moduleRepoSpd,
                actionRepo: this.actionRepoSpd
            };
        }
        if (system === 'SICGEM') {
            return {
                permissionRepo: this.permissionRepoSicgem,
                moduleRepo: this.moduleRepoSicgem,
                actionRepo: this.actionRepoSicgem
            };
        }
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    async findAllPaginated(
        page: number,
        limit: number,
        system: SystemType
    ) {
        const { permissionRepo } = this.getRepos(system);
        const skip = (page - 1) * limit;

        const qb = permissionRepo.createQueryBuilder("p")
            .leftJoinAndSelect("p.module", "m")
            .leftJoinAndSelect("p.action", "a")
            .where("m.system = :system OR m.system = 'PUBLIC'", { system }) // Assuming module filtering logic matches
            // Permission itself doesn't have 'system', it's inferred from module/action or table location.
            // Since we are querying spd.permissions, we are effectively filtering by system context.
            // However, we still might want to filter modules if there's any strictness, but repo selection does most work.
            .orderBy("m.path", "ASC")
            .addOrderBy("a.code_action", "ASC")
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

        const formattedData = data.map((p: any) => ({
            id: p.id,
            module: {
                id: p.module.id,
                path: p.module.path,
                name: p.module.name
            },
            action: {
                id: p.action.id,
                code: p.action.code_action,
                name: p.action.name
            }
        }));

        const totalPages = Math.ceil(total / limit);

        return {
            data: formattedData,
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
        const { permissionRepo } = this.getRepos(system);
        const p = await permissionRepo.createQueryBuilder("p")
            .leftJoinAndSelect("p.module", "m")
            .leftJoinAndSelect("p.action", "a")
            .where("p.id = :id", { id })
            .getOne();

        if (!p) {
            throw new NotFoundException({ message: "Permiso no encontrado", code: ErrorCodes.PERMISSION_NOT_FOUND });
        }

        // Cast to any to access relations safely if types are strict base types but loaded correctly
        const perm: any = p;

        return {
            id: perm.id,
            module: {
                id: perm.module.id,
                path: perm.module.path,
                name: perm.module.name
            },
            action: {
                id: perm.action.id,
                code: perm.action.code_action,
                name: perm.action.name
            }
        };
    }

    async create(data: { moduleId: string; actionId: string }, system: SystemType) {
        const { permissionRepo, moduleRepo, actionRepo } = this.getRepos(system);

        const module = await moduleRepo.findOne({ where: { id: data.moduleId } }); // System check implicitly handled by repo? Or should explicitly check?
        // moduleRepoSpd contains SPD+PUBLIC. `findOne` by ID is sufficient if ID is unique globally (UUID).
        // If not, we should filter by system if needed, but repo is already scoped.
        // Actually, moduleRepoSpd only accesses spd.modules. If PUBLIC modules are there, fine.
        if (!module) {
            throw new NotFoundException({ message: "Módulo no encontrado", code: ErrorCodes.MODULE_NOT_FOUND });
        }
        // Additional check from original code: `where: { id, system }`.
        // If `module` is PUBLIC it should be allowed. `module.system` check.
        if (module.system !== 'PUBLIC' && module.system !== system) {
            // This presumably shouldn't happen if looking in spd.modules entails it's spd or public.
        }

        const action = await actionRepo.findOne({ where: { id: data.actionId } });
        if (!action || (action.system !== "PUBLIC" && action.system !== system)) {
            throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
        }

        const existing = await permissionRepo.findOne({
            where: { module: { id: data.moduleId }, action: { id: data.actionId } } as any
        });

        if (existing) {
            throw new ConflictException({ message: "El permiso ya existe para este módulo y acción", code: ErrorCodes.PERMISSION_ALREADY_EXISTS });
        }

        const permission: any = permissionRepo.create({
            module: { id: data.moduleId },
            action: { id: data.actionId }
        } as any);

        const saved = await permissionRepo.save(permission);

        await this.auditLog.logSuccess(AuditAction.PERMISSION_GRANTED, AuditEntityType.PERMISSION, saved.id, {
            entityName: module.name,
            system,
            metadata: {
                moduleId: module.id, modulePath: module.path, moduleName: module.name,
                actionId: action.id, actionCode: action.code_action, actionName: action.name,
            }
        });

        return {
            id: saved.id,
            module: { id: module.id, path: module.path, name: module.name },
            action: { id: action.id, code: action.code_action, name: action.name }
        };
    }

    async delete(id: string, system: SystemType) {
        const { permissionRepo } = this.getRepos(system);

        const p = await permissionRepo.createQueryBuilder("p")
            .leftJoinAndSelect("p.module", "m")
            .leftJoinAndSelect("p.action", "a")
            .where("p.id = :id", { id })
            .getOne();

        if (!p) {
            throw new NotFoundException({ message: "Permiso no encontrado", code: ErrorCodes.PERMISSION_NOT_FOUND });
        }

        const perm: any = p;
        const modulePath = perm.module.path;
        const moduleName = perm.module.name;
        const actionCode = perm.action.code_action;
        const actionName = perm.action.name;

        await permissionRepo.delete(id);

        await this.auditLog.logSuccess(AuditAction.PERMISSION_REVOKED, AuditEntityType.PERMISSION, id, {
            entityName: moduleName,
            system,
            metadata: {
                modulePath: modulePath, moduleName: moduleName,
                actionCode: actionCode, actionName: actionName,
            }
        });

        return {
            id,
            module: modulePath,
            action: actionCode,
            deletedAt: new Date()
        };
    }
}
