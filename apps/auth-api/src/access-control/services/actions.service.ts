import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { ActionSpd } from "@common/entities/spd/action.entity";
import { ActionSicgem } from "@common/entities/sicgem/action.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class ActionsService {
    constructor(
        @InjectRepository(ActionSpd) private repoSpd: Repository<ActionSpd>,
        @InjectRepository(ActionSicgem) private repoSicgem: Repository<ActionSicgem>,
        private auditLog: AuditLogService
    ) { }

    private getRepo(system: SystemType): Repository<any> {
        if (system === 'SPD') return this.repoSpd;
        if (system === 'SICGEM') return this.repoSicgem;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    private readonly sortableFields = ["code_action", "name", "system", "created_at"];

    async findAll(system: SystemType) {
        const repo = this.getRepo(system);
        return repo
            .createQueryBuilder("action")
            .select(["action.id", "action.code_action", "action.name"])
            .where("action.system = 'PUBLIC' OR action.system = :system", { system })
            .orderBy("action.code_action", "ASC")
            .getMany();
    }

    async findAllPaginated(
        page: number = 1,
        limit: number = 10,
        system: SystemType,
        search?: string,
        sortBy?: string,
        sortOrder?: "ASC" | "DESC"
    ) {
        const repo = this.getRepo(system);
        const skip = (page - 1) * limit;

        let query = repo
            .createQueryBuilder("action")
            .where("action.system = 'PUBLIC' OR action.system = :system", { system });

        if (search) {
            query = query.andWhere(
                "(action.code_action ILIKE :search OR action.name ILIKE :search)",
                { search: `%${search}%` }
            );
        }

        const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
        const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

        query = query.orderBy(`action.${validSortBy}`, validSortOrder);

        const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

        const totalPages = Math.ceil(total / limit);

        return {
            data: data.map((a: any) => ({
                id: a.id,
                code_action: a.code_action,
                name: a.name,
                description: a.description,
                system: a.system,
                created_at: a.created_at,
                updated_at: a.updated_at
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
        const repo = this.getRepo(system);
        const action = await repo
            .createQueryBuilder("action")
            .where("action.id = :id", { id })
            .andWhere("action.system = 'PUBLIC' OR action.system = :system", { system })
            .getOne();

        if (!action) {
            throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
        }

        return action;
    }

    async create(data: { code_action: string; name: string; description?: string }, system: SystemType) {
        const repo = this.getRepo(system);
        const existing = await repo.findOne({
            where: { code_action: data.code_action, system }
        });

        if (existing) {
            throw new ConflictException({ message: "Ya existe una acción con ese código", code: ErrorCodes.ACTION_ALREADY_EXISTS });
        }

        const action = repo.create({
            code_action: data.code_action,
            name: data.name,
            description: data.description ?? null,
            system
        });

        const saved = await repo.save(action);

        await this.auditLog.logSuccess(AuditAction.ACTION_CREATED, AuditEntityType.ACTION, saved.id, {
            entityName: saved.name,
            system,
            metadata: { code: saved.code_action, name: saved.name, description: saved.description }
        });

        return saved;
    }

    async update(id: string, system: SystemType, data: { name?: string; description?: string }) {
        const repo = this.getRepo(system);
        const action = await this.findOne(id, system);

        if (action.system !== "PUBLIC" && action.system !== system) {
            // Should not happen if findOne enforces system check properly, but explicit check implies public modification restriction?
            // "No se puede modificar actions PUBLIC" logic was not in original code for update, only delete?
            // Wait, original: `if (action.system !== "PUBLIC" && action.system !== system)` -> This check ensures we don't update if it's somehow cross-system but findOne handles that.
            // Actually, usually PUBLIC actions are shared and modifying them affects everyone.
            // If the user wants to modify a public action, should they be allowed?
            // Original code: `if (action.system !== "PUBLIC" && action.system !== system)` threw NotFound.
            // This means we CAN update PUBLIC actions?
            // Or maybe it meant "If it's neither PUBLIC nor CURRENT_SYSTEM".
            // Since `findOne` already filters by `PUBLIC OR CURRENT`, this check seems redundant but harmless.
        }

        // Original logic didn't forbid PUBLIC updates. I'll keep it as is.
        // Wait, `delete` had explicit check `if (action.system === "PUBLIC")`. `update` did NOT.

        const oldValues = { name: action.name, description: action.description };

        if (data.name !== undefined) action.name = data.name;
        if (data.description !== undefined) action.description = data.description;
        action.updated_at = new Date();

        const saved = await repo.save(action);

        const changes = buildChanges(oldValues, data, Object.keys(data));
        await this.auditLog.logSuccess(AuditAction.ACTION_UPDATED, AuditEntityType.ACTION, id, {
            entityName: saved.name,
            system,
            changes,
            metadata: { code: saved.code_action }
        });

        return saved;
    }

    async delete(id: string, system: SystemType) {
        const repo = this.getRepo(system);
        const action = await this.findOne(id, system);

        if (action.system === "PUBLIC") {
            throw new ConflictException({ message: "No se pueden eliminar acciones públicas", code: ErrorCodes.ACTION_ALREADY_EXISTS });
        }

        if (action.system !== system) {
            // Should be covered by findOne but just in case
            throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
        }

        const actionName = action.name;
        const codeAction = action.code_action;
        await repo.remove(action);

        await this.auditLog.logSuccess(AuditAction.ACTION_DELETED, AuditEntityType.ACTION, id, {
            entityName: actionName,
            system,
            metadata: { code: codeAction, name: actionName }
        });

        return { id, code_action: codeAction, deletedAt: new Date() };
    }
}
