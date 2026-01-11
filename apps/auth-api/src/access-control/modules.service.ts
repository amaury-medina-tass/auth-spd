import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { Permission } from "@common/entities/permission.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleEntity) private repo: Repository<ModuleEntity>,
    @InjectRepository(ActionEntity) private actionRepo: Repository<ActionEntity>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>
  ) { }

  private readonly sortableFields = ["name", "path", "created_at"];

  async findAll(system: SystemType) {
    return this.repo.find({
      where: { system },
      select: ["id", "name", "path"],
      order: { path: "ASC" }
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
        { path: ILike(`%${search}%`), system }
      ];
    }

    const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    const [data, total] = await this.repo.findAndCount({
      where: whereCondition,
      skip,
      take: limit,
      order: { [validSortBy]: validSortOrder }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(m => ({
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
    const module = await this.repo.findOne({ where: { id, system } });

    if (!module) {
      throw new NotFoundException({ message: "Módulo no encontrado", code: ErrorCodes.MODULE_NOT_FOUND });
    }

    return module;
  }

  async create(data: { name: string; path: string; description?: string }, system: SystemType) {
    const existingByPath = await this.repo.findOne({ where: { path: data.path, system } });
    if (existingByPath) {
      throw new ConflictException({ message: "Ya existe un módulo con ese path", code: ErrorCodes.MODULE_ALREADY_EXISTS });
    }

    const module = this.repo.create({
      name: data.name,
      path: data.path,
      description: data.description ?? null,
      system
    });

    return this.repo.save(module);
  }

  async update(id: string, system: SystemType, data: { name?: string; description?: string }) {
    const module = await this.findOne(id, system);

    if (data.name !== undefined) module.name = data.name;
    if (data.description !== undefined) module.description = data.description;
    module.updated_at = new Date();

    return this.repo.save(module);
  }

  async delete(id: string, system: SystemType) {
    const module = await this.findOne(id, system);

    await this.repo.remove(module);

    return { id, path: module.path, deletedAt: new Date() };
  }

  async getModuleWithActions(id: string, system: SystemType) {
    const module = await this.findOne(id, system);

    // Get all available actions for this system (PUBLIC + system-specific)
    const allActions = await this.actionRepo
      .createQueryBuilder("action")
      .where("action.system = 'PUBLIC' OR action.system = :system", { system })
      .orderBy("action.code_action", "ASC")
      .getMany();

    // Get actions already assigned to this module (permissions)
    const assignedPermissions = await this.permissionRepo
      .createQueryBuilder("p")
      .innerJoinAndSelect("p.action", "action")
      .where("p.module_id = :moduleId", { moduleId: id })
      .andWhere("action.system = 'PUBLIC' OR action.system = :system", { system })
      .getMany();

    const assignedActions = assignedPermissions.map(p => ({
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
}

