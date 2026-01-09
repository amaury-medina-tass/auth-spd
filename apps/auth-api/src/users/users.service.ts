import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { User } from "@common/entities/user.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { Role } from "@common/entities/role.entity";

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
    search?: string,
    sortBy?: string,
    sortOrder?: "ASC" | "DESC"
  ) {
    const skip = (page - 1) * limit;

    const whereCondition = search
      ? [
        { email: ILike(`%${search}%`) },
        { first_name: ILike(`%${search}%`) },
        { last_name: ILike(`%${search}%`) },
        { document_number: ILike(`%${search}%`) }
      ]
      : {};

    // Validar campo de ordenamiento
    const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    const [users, total] = await this.repo.findAndCount({
      select: ["id", "email", "first_name", "last_name", "document_number", "is_active", "created_at", "updated_at"],
      relations: ["user_roles", "user_roles.role"],
      where: whereCondition,
      skip,
      take: limit,
      order: { [validSortBy]: validSortOrder }
    });

    // Transformar los datos para incluir los roles
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

  async findOne(id: string) {
    const user = await this.repo.findOne({
      where: { id },
      relations: ["user_roles", "user_roles.role"]
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { user_roles, ...userData } = user;
    return {
      ...userData,
      roles: user_roles?.map(ur => ur.role ? { id: ur.role.id, name: ur.role.name } : null).filter(Boolean) || []
    };
  }

  async assignRole(userId: string, roleId: string) {
    // Verificar que el usuario existe
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar que el rol existe
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }

    // Verificar si el usuario ya tiene este rol asignado
    const existingUserRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId }
    });
    if (existingUserRole) {
      throw new ConflictException(`El usuario ya tiene asignado el rol ${role.name}`);
    }

    // Crear la relación usuario-rol
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

  async unassignRole(userId: string, roleId: string) {
    // Verificar que el usuario existe
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar que el rol existe
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
    }

    // Verificar si el usuario tiene este rol asignado
    const existingUserRole = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId }
    });
    if (!existingUserRole) {
      throw new NotFoundException(`El usuario no tiene asignado el rol ${role.name}`);
    }

    await this.userRoleRepo.remove(existingUserRole);

    return {
      userId,
      roleId,
      roleName: role.name,
      unassignedAt: new Date()
    };
  }

  async update(id: string, data: { email?: string; document_number?: string; first_name?: string; last_name?: string; is_active?: boolean }) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Validar que el email no esté en uso por otro usuario
    if (data.email !== undefined && data.email !== user.email) {
      const existingByEmail = await this.repo.findOne({ where: { email: data.email } });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException(`El email ${data.email} ya está en uso`);
      }
    }

    // Validar que el número de documento no esté en uso por otro usuario
    if (data.document_number !== undefined && data.document_number !== user.document_number) {
      const existingByDocument = await this.repo.findOne({ where: { document_number: data.document_number } });
      if (existingByDocument && existingByDocument.id !== id) {
        throw new ConflictException(`El número de documento ${data.document_number} ya está en uso`);
      }
    }

    // Solo actualizar los campos permitidos que fueron enviados
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
}