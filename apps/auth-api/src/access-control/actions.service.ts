import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { ActionEntity } from "@common/entities/action.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges } from "@common/cosmosdb";

type ActionSystemType = "PUBLIC" | SystemType;

@Injectable()
export class ActionsService {
  constructor(
    @InjectRepository(ActionEntity) private repo: Repository<ActionEntity>,
    private auditLog: AuditLogService
  ) { }

  private readonly sortableFields = ["code_action", "name", "system", "created_at"];

  async findAll(system: SystemType) {
    return this.repo
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
    const skip = (page - 1) * limit;

    let query = this.repo
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
      data: data.map(a => ({
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
    const action = await this.repo
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
    const existing = await this.repo.findOne({
      where: { code_action: data.code_action, system }
    });

    if (existing) {
      throw new ConflictException({ message: "Ya existe una acción con ese código", code: ErrorCodes.ACTION_ALREADY_EXISTS });
    }

    const action = this.repo.create({
      code_action: data.code_action,
      name: data.name,
      description: data.description ?? null,
      system
    });

    const saved = await this.repo.save(action);

    await this.auditLog.logSuccess(AuditAction.ACTION_CREATED, "Action", saved.id, {
      entityName: saved.name,
      system,
      metadata: { code_action: saved.code_action, name: saved.name }
    });

    return saved;
  }

  async update(id: string, system: SystemType, data: { name?: string; description?: string }) {
    const action = await this.findOne(id, system);

    if (action.system !== "PUBLIC" && action.system !== system) {
      throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
    }

    const oldValues = { name: action.name, description: action.description };

    if (data.name !== undefined) action.name = data.name;
    if (data.description !== undefined) action.description = data.description;
    action.updated_at = new Date();

    const saved = await this.repo.save(action);

    const changes = buildChanges(oldValues, data, Object.keys(data));
    await this.auditLog.logSuccess(AuditAction.ACTION_UPDATED, "Action", id, {
      entityName: saved.name,
      system,
      changes,
      metadata: { code_action: saved.code_action }
    });

    return saved;
  }

  async delete(id: string, system: SystemType) {
    const action = await this.findOne(id, system);

    if (action.system === "PUBLIC") {
      throw new ConflictException({ message: "No se pueden eliminar acciones públicas", code: ErrorCodes.ACTION_ALREADY_EXISTS });
    }

    if (action.system !== system) {
      throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
    }

    const actionName = action.name;
    const codeAction = action.code_action;
    await this.repo.remove(action);

    await this.auditLog.logSuccess(AuditAction.ACTION_DELETED, "Action", id, {
      entityName: actionName,
      system,
      metadata: { code_action: codeAction, name: actionName }
    });

    return { id, code_action: codeAction, deletedAt: new Date() };
  }
}
