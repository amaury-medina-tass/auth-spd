import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission } from "@common/entities/permission.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { AuditLogService, AuditAction, AuditEntityType } from "@common/cosmosdb";

@Injectable()
export class PermissionsService {
    constructor(
        @InjectRepository(Permission) private repo: Repository<Permission>,
        @InjectRepository(ModuleEntity) private modules: Repository<ModuleEntity>,
        @InjectRepository(ActionEntity) private actions: Repository<ActionEntity>,
        private auditLog: AuditLogService
    ) { }

    async findAllPaginated(
        page: number = 1,
        limit: number = 10,
        system: SystemType
    ) {
        const skip = (page - 1) * limit;

        // Use raw SQL to avoid PostgreSQL enum type conflicts
        const data = await this.repo.manager.query<{
            id: string;
            module_id: string;
            module_path: string;
            module_name: string;
            action_id: string;
            action_code: string;
            action_name: string;
        }[]>(
            `
      SELECT 
        p.id,
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
      LIMIT $3 OFFSET $4
      `,
            [system, system, limit, skip]
        );

        // Get total count
        const countResult = await this.repo.manager.query<{ count: string }[]>(
            `
      SELECT COUNT(*) as count
      FROM permissions p
      JOIN modules m ON m.id = p.module_id AND m.system = $1::modules_system_enum
      JOIN actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $2::actions_system_enum)
      `,
            [system, system]
        );

        const total = parseInt(countResult[0]?.count || "0", 10);

        const formattedData = data.map(p => ({
            id: p.id,
            module: {
                id: p.module_id,
                path: p.module_path,
                name: p.module_name
            },
            action: {
                id: p.action_id,
                code: p.action_code,
                name: p.action_name
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
        const result = await this.repo.manager.query<{
            id: string;
            module_id: string;
            module_path: string;
            module_name: string;
            action_id: string;
            action_code: string;
            action_name: string;
        }[]>(
            `
      SELECT 
        p.id,
        m.id AS module_id,
        m.path AS module_path,
        m.name AS module_name,
        a.id AS action_id,
        a.code_action AS action_code,
        a.name AS action_name
      FROM permissions p
      JOIN modules m ON m.id = p.module_id AND m.system = $2::modules_system_enum
      JOIN actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $3::actions_system_enum)
      WHERE p.id = $1
      `,
            [id, system, system]
        );

        if (!result.length) {
            throw new NotFoundException({ message: "Permiso no encontrado", code: ErrorCodes.PERMISSION_NOT_FOUND });
        }

        const p = result[0];
        return {
            id: p.id,
            module: {
                id: p.module_id,
                path: p.module_path,
                name: p.module_name
            },
            action: {
                id: p.action_id,
                code: p.action_code,
                name: p.action_name
            }
        };
    }

    async create(data: { moduleId: string; actionId: string }, system: SystemType) {
        const module = await this.modules.findOne({ where: { id: data.moduleId, system } });
        if (!module) {
            throw new NotFoundException({ message: "Módulo no encontrado", code: ErrorCodes.MODULE_NOT_FOUND });
        }

        const action = await this.actions.findOne({ where: { id: data.actionId } });
        if (!action || (action.system !== "PUBLIC" && action.system !== system)) {
            throw new NotFoundException({ message: "Acción no encontrada", code: ErrorCodes.ACTION_NOT_FOUND });
        }

        const existing = await this.repo.findOne({
            where: { module_id: data.moduleId, action_id: data.actionId }
        });

        if (existing) {
            throw new ConflictException({ message: "El permiso ya existe para este módulo y acción", code: ErrorCodes.PERMISSION_ALREADY_EXISTS });
        }

        const permission = this.repo.create({
            module_id: data.moduleId,
            action_id: data.actionId
        });

        const saved = await this.repo.save(permission);

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
        const result = await this.repo.manager.query<{
            id: string;
            module_path: string;
            module_name: string;
            action_code: string;
            action_name: string;
        }[]>(
            `
      SELECT 
        p.id,
        m.path AS module_path,
        m.name AS module_name,
        a.code_action AS action_code,
        a.name AS action_name
      FROM permissions p
      JOIN modules m ON m.id = p.module_id AND m.system = $2::modules_system_enum
      JOIN actions a ON a.id = p.action_id
      WHERE p.id = $1
      `,
            [id, system]
        );

        if (!result.length) {
            throw new NotFoundException({ message: "Permiso no encontrado", code: ErrorCodes.PERMISSION_NOT_FOUND });
        }

        const p = result[0];
        await this.repo.delete(id);

        await this.auditLog.logSuccess(AuditAction.PERMISSION_REVOKED, AuditEntityType.PERMISSION, id, {
            entityName: p.module_name,
            system,
            metadata: {
                modulePath: p.module_path, moduleName: p.module_name,
                actionCode: p.action_code, actionName: p.action_name,
            }
        });

        return {
            id,
            module: p.module_path,
            action: p.action_code,
            deletedAt: new Date()
        };
    }
}
