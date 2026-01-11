import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { Role } from "@common/entities/role.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private repo: Repository<Role>
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

    // Get ALL available actions for each module (from permissions table)
    const allModuleActions = await this.repo.manager.query<{
      module_id: string;
      module_path: string;
      module_name: string;
      action_id: string;
      action_code: string;
      action_name: string;
    }[]>(
      `
      SELECT DISTINCT 
        m.id AS module_id,
        m.path AS module_path,
        m.name AS module_name,
        a.id AS action_id,
        a.code_action AS action_code,
        a.name AS action_name
      FROM permissions p
      JOIN modules m ON m.id = p.module_id AND m.system = $1::modules_system_enum
      JOIN actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $2::actions_system_enum)
      ORDER BY m.path, a.code_action
      `,
      [system, system]
    );

    // Get role's granted permissions
    const grantedPermissions = await this.repo.manager.query<{
      module_path: string;
      action_code: string;
      allowed: boolean;
    }[]>(
      `
      SELECT 
        m.path AS module_path,
        a.code_action AS action_code,
        rp.allowed
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      JOIN modules m ON m.id = p.module_id
      JOIN actions a ON a.id = p.action_id
      WHERE rp.role_id = $1
      `,
      [id]
    );

    // Build a set of granted permissions
    const grantedSet = new Map<string, boolean>();
    for (const gp of grantedPermissions) {
      grantedSet.set(`${gp.module_path}:${gp.action_code}`, gp.allowed);
    }

    // Group all actions by module, marking allowed status
    const permissionsByModule: Record<string, { moduleId: string; moduleName: string; actions: { id: string; code: string; name: string; allowed: boolean }[] }> = {};

    for (const action of allModuleActions) {
      if (!permissionsByModule[action.module_path]) {
        permissionsByModule[action.module_path] = { moduleId: action.module_id, moduleName: action.module_name, actions: [] };
      }
      const key = `${action.module_path}:${action.action_code}`;
      permissionsByModule[action.module_path].actions.push({
        id: action.action_id,
        code: action.action_code,
        name: action.action_name,
        allowed: grantedSet.get(key) ?? false
      });
    }

    return {
      ...role,
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

    const role = this.repo.create({
      name: data.name,
      description: data.description ?? null,
      is_active: true,
      is_default: data.is_default ?? false,
      system
    });

    return this.repo.save(role);
  }

  async update(id: string, system: SystemType, data: { name?: string; description?: string; is_active?: boolean; is_default?: boolean }) {
    const role = await this.repo.findOne({
      where: { id, system }
    });

    if (!role) {
      throw new NotFoundException({ message: "Rol no encontrado", code: ErrorCodes.ROLE_NOT_FOUND });
    }

    if (data.name !== undefined && data.name !== role.name) {
      const existing = await this.repo.findOne({
        where: { name: data.name, system }
      });

      if (existing && existing.id !== id) {
        throw new ConflictException({ message: `Ya existe un rol con el nombre "${data.name}"`, code: ErrorCodes.ROLE_ALREADY_EXISTS });
      }
      role.name = data.name;
    }

    if (data.description !== undefined) role.description = data.description;
    if (data.is_active !== undefined) role.is_active = data.is_active;
    if (data.is_default !== undefined) role.is_default = data.is_default;
    role.updated_at = new Date();

    return this.repo.save(role);
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

    await this.repo.remove(role);

    return {
      id,
      name: role.name,
      deletedAt: new Date()
    };
  }
}

