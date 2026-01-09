import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { Role } from "@common/entities/role.entity";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private repo: Repository<Role>
  ) { }

  private readonly sortableFields = ["name", "is_active", "created_at", "updated_at"];

  /**
   * Lista general de roles (solo id y nombre)
   */
  async findAll() {
    return this.repo.find({
      select: ["id", "name"],
      order: { name: "ASC" }
    });
  }

  /**
   * Lista paginada de roles
   */
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
        { name: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) }
      ]
      : {};

    const validSortBy = sortBy && this.sortableFields.includes(sortBy) ? sortBy : "created_at";
    const validSortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    const [data, total] = await this.repo.findAndCount({
      select: ["id", "name", "description", "is_active", "created_at", "updated_at"],
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
}