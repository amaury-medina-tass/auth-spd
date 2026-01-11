import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private roleRepo: Repository<Role>
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

  async assignRole(userId: string, roleId: string, system: SystemType) {
    const userInSystem = await this.repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .where("user.id = :userId", { userId })
      .getOne();

    if (!userInSystem) {
      throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
    }

    const role = await this.roleRepo.findOne({ where: { id: roleId, system } });
    if (!role) {
      throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
    }

    const existingUserRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId }
    });
    if (existingUserRole) {
      throw new ConflictException({ message: `El usuario ya tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_ALREADY_ASSIGNED });
    }

    const userRole = this.userRoleRepo.create({
      user_id: userId,
      role_id: roleId
    });

    await this.userRoleRepo.save(userRole);

    return {
      userId,
      roleId,
      roleName: role.name,
      assignedAt: userRole.created_at
    };
  }

  async unassignRole(userId: string, roleId: string, system: SystemType) {
    const userInSystem = await this.repo
      .createQueryBuilder("user")
      .innerJoin("user.user_roles", "ur")
      .innerJoin("ur.role", "role", "role.system = :system", { system })
      .where("user.id = :userId", { userId })
      .getOne();

    if (!userInSystem) {
      throw new NotFoundException({ message: "Usuario no encontrado en este sistema", code: ErrorCodes.USER_NOT_FOUND });
    }

    const role = await this.roleRepo.findOne({ where: { id: roleId, system } });
    if (!role) {
      throw new NotFoundException({ message: "Rol no encontrado en este sistema", code: ErrorCodes.ROLE_NOT_FOUND });
    }

    const existingUserRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId }
    });
    if (!existingUserRole) {
      throw new NotFoundException({ message: `El usuario no tiene asignado el rol ${role.name}`, code: ErrorCodes.ROLE_NOT_ASSIGNED });
    }

    await this.userRoleRepo.remove(existingUserRole);

    return {
      userId,
      roleId,
      roleName: role.name,
      unassignedAt: new Date()
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

    await this.userRoleRepo.delete({ user_id: id });
    await this.repo.remove(user);

    return {
      id,
      email: user.email,
      deletedAt: new Date()
    };
  }
}