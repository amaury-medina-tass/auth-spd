import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseUser } from "@common/entities/base/base-user.entity";
import { UserSpd } from "@common/entities/spd/user.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, buildChanges, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserSpd) private readonly repoSpd: Repository<UserSpd>,
    @InjectRepository(UserSicgem) private readonly repoSicgem: Repository<UserSicgem>,
    @InjectRepository(UserRoleSpd) private readonly userRoleRepoSpd: Repository<UserRoleSpd>,
    @InjectRepository(UserRoleSicgem) private readonly userRoleRepoSicgem: Repository<UserRoleSicgem>,
    @InjectRepository(RoleSpd) private readonly roleRepoSpd: Repository<RoleSpd>,
    @InjectRepository(RoleSicgem) private readonly roleRepoSicgem: Repository<RoleSicgem>,
    private readonly auditLog: AuditLogService
  ) { }

  private readonly sortableFields = ["first_name", "last_name", "email", "document_number", "is_active", "created_at", "updated_at"];

  private getRepo(system: SystemType): Repository<BaseUser> {
    if (system === 'SPD') return this.repoSpd as unknown as Repository<BaseUser>;
    if (system === 'SICGEM') return this.repoSicgem as unknown as Repository<BaseUser>;
    throw new NotFoundException(`Sistema no soportado o inválido: ${system}`);
  }

  private getUserRoleRepo(system: SystemType): Repository<any> {
    if (system === 'SPD') return this.userRoleRepoSpd;
    if (system === 'SICGEM') return this.userRoleRepoSicgem;
    throw new NotFoundException(`Sistema no soportado o inválido: ${system}`);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    system: SystemType,
    search?: string,
    sortBy?: string,
    sortOrder?: "ASC" | "DESC"
  ) {
    const skip = (page - 1) * limit;
    const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    const repo = this.getRepo(system);

    // Note: createQueryBuilder alias "user" allows generic usage
    let query = repo
      .createQueryBuilder("user")
      .select([
        "user.id", "user.email", "user.first_name", "user.last_name",
        "user.document_number", "user.is_active", "user.created_at", "user.updated_at"
      ])
      .innerJoin("user.user_roles", "ur") // Works because BaseUser doesn't have it but Concrete does, and we are using concrete repo
      .innerJoin("ur.role", "role") // Schema specific role
      .leftJoinAndSelect("user.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "user_role"); // Schema specific role

    // Note: Relation filtering by system in 'role' IS NOT NEEDED anymore because
    // the schema itself implies the system. RoleSpd is implicitly in Spd system.
    // However, Role entity still has 'system' column. We can double check or ignore.
    // The Join 'ur.role' connects to RoleSpd/Sicgem automatically.

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

    const data = users.map((user: any) => {
      const { user_roles, ...userData } = user;
      return {
        ...userData,
        roles: user_roles?.map((ur: any) => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || []
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
    const repo = this.getRepo(system);
    const user: any = await repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role")
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
      roles: user_roles?.map((ur: any) => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || []
    };
  }

  private async validateUniqueEmail(repo: Repository<BaseUser>, email: string, excludeId: string) {
    const existing = await repo.findOne({ where: { email } } as any);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({ message: `El email ${email} ya está en uso`, code: ErrorCodes.EMAIL_IN_USE });
    }
  }

  private async validateUniqueDocument(repo: Repository<BaseUser>, documentNumber: string, excludeId: string) {
    const existing = await repo.findOne({ where: { document_number: documentNumber } } as any);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({ message: `El número de documento ${documentNumber} ya está en uso`, code: ErrorCodes.DOCUMENT_IN_USE });
    }
  }

  async update(id: string, system: SystemType, data: { email?: string; document_number?: string; first_name?: string; last_name?: string; is_active?: boolean }) {
    const repo = this.getRepo(system);
    const user: any = await repo
      .createQueryBuilder("user")
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
      await this.validateUniqueEmail(repo, data.email, id);
    }

    if (data.document_number !== undefined && data.document_number !== user.document_number) {
      await this.validateUniqueDocument(repo, data.document_number, id);
    }

    if (data.email !== undefined) user.email = data.email;
    if (data.document_number !== undefined) user.document_number = data.document_number;
    if (data.first_name !== undefined) user.first_name = data.first_name;
    if (data.last_name !== undefined) user.last_name = data.last_name;
    if (data.is_active !== undefined) user.is_active = data.is_active;

    user.updated_at = new Date();

    await repo.save(user);

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
    const repo = this.getRepo(system);
    const userRoleRepo = this.getUserRoleRepo(system);

    const user: any = await repo
      .createQueryBuilder("user")
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
    }

    const entityName = `${user.first_name} ${user.last_name}`;
    const userEmail = user.email;

    await userRoleRepo.delete({ user_id: id });
    await repo.remove(user);

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