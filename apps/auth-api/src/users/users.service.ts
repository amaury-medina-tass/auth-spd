import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private auditLog: AuditLogService
  ) { }

  private readonly sortableFields = ["first_name", "last_name", "email", "document_number", "is_active", "created_at", "updated_at"];

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    system: SystemType,
    search?: string,
    sortBy?: string,
    sortOrder?: "ASC" | "DESC"
  ) {
    const skip = (page - 1) * limit;
    const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    let query = this.repo
      .createQueryBuilder("user")
      .select([
        "user.id", "user.email", "user.first_name", "user.last_name",
        "user.document_number", "user.is_active", "user.created_at", "user.updated_at"
      ])
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .leftJoinAndSelect("user.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "user_role");

    if (search) {
      query = query.andWhere(
        "(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.document_number ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    const [users, total] = await query
      .orderBy(`user.${validSortBy}`, validSortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = users.map(user => {
      const { user_roles, ...userData } = user;
      return {
        ...userData,
        roles: user_roles?.map(ur => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || []
      };
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
    const user = await this.repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .leftJoinAndSelect("user.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "user_role")
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });
    }

    const { user_roles, ...userData } = user;
    return {
      ...userData,
      roles: user_roles?.map(ur => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || []
    };
  }

  async update(id: string, system: SystemType, data: { email?: string; document_number?: string; first_name?: string; last_name?: string; is_active?: boolean }) {
    const user = await this.repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
    }

    // Guardar valores anteriores para el log de cambios
    const oldValues = {
      email: user.email,
      document_number: user.document_number,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
    };

    if (data.email !== undefined && data.email !== user.email) {
      const existingByEmail = await this.repo.findOne({ where: { email: data.email } });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException({ message: `El email ${data.email} ya está en uso`, code: ErrorCodes.EMAIL_IN_USE });
      }
    }

    if (data.document_number !== undefined && data.document_number !== user.document_number) {
      const existingByDocument = await this.repo.findOne({ where: { document_number: data.document_number } });
      if (existingByDocument && existingByDocument.id !== id) {
        throw new ConflictException({ message: `El número de documento ${data.document_number} ya está en uso`, code: ErrorCodes.DOCUMENT_IN_USE });
      }
    }

    if (data.email !== undefined) user.email = data.email;
    if (data.document_number !== undefined) user.document_number = data.document_number;
    if (data.first_name !== undefined) user.first_name = data.first_name;
    if (data.last_name !== undefined) user.last_name = data.last_name;
    if (data.is_active !== undefined) user.is_active = data.is_active;

    user.updated_at = new Date();

    await this.repo.save(user);

    // Log detallado con cambios
    const changes = buildChanges(oldValues, data, Object.keys(data));

    await this.auditLog.logSuccess(AuditAction.USER_UPDATED, AuditEntityType.USER, id, {
      entityName: `${user.first_name} ${user.last_name}`,
      system,
      changes,
      metadata: {
        email: user.email,
      }
    });

    const { password_hash, ...result } = user;
    return result;
  }

  async delete(id: string, system: SystemType) {
    const user = await this.repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
    }

    const entityName = `${user.first_name} ${user.last_name}`;
    const userEmail = user.email;

    await this.userRoleRepo.delete({ user_id: id });
    await this.repo.remove(user);

    await this.auditLog.logSuccess(AuditAction.USER_DELETED, AuditEntityType.USER, id, {
      entityName,
      system,
      metadata: {
        email: userEmail,
        document_number: user.document_number,
      }
    });

    return {
      id,
      email: userEmail,
      deletedAt: new Date()
    };
  }
}