import { Controller, Get, Query, Param, UseGuards, ForbiddenException } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AuditQueryService, AuditLogQueryOptions } from "./audit-query.service";
import { FindAllAuditQueryDto } from "./dto/find-all-audit-query.dto";

@Controller("audit")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
    constructor(private readonly auditQuery: AuditQueryService) { }

    /**
     * Resuelve el sistema a consultar.
     * - Si se envía `system` como query param, se usa ese valor (con validación de acceso).
     * - AUTH logs: cualquier usuario puede consultarlos.
     * - SPD logs: solo usuarios con system "SPD" pueden consultarlos.
     */
    private resolveSystem(querySystem: string | undefined, userSystem: SystemType): string {
        const requested = querySystem?.toUpperCase() || userSystem;
        if (requested === "SPD" && userSystem !== "SPD") {
            throw new ForbiddenException("No tienes acceso a los logs de Core SPD");
        }
        return requested;
    }

    /**
     * GET /audit
     * Lista logs de auditoría paginados con filtros
     */
    @Get()
    @RequirePermission("/audit", "READ")
    @ResponseMessage("Lista de logs de auditoría obtenida")
    async findAll(
        @CurrentUser("system") userSystem: SystemType,
        @Query() query: FindAllAuditQueryDto
    ) {
        const system = this.resolveSystem(query.system, userSystem);

        const options: AuditLogQueryOptions = {
            page: query.page ? Number.parseInt(query.page, 10) : 1,
            limit: query.limit ? Math.min(Number.parseInt(query.limit, 10), 100) : 20,
            entityType: query.entityType,
            action: query.action,
            system,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            search: query.search,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder
        };

        return this.auditQuery.findAll(options);
    }

    /**
     * GET /audit/stats
     * Estadísticas de logs de auditoría
     */
    @Get("stats")
    @RequirePermission("/audit", "READ")
    @ResponseMessage("Estadísticas de auditoría obtenidas")
    async getStats(
        @CurrentUser("system") userSystem: SystemType,
        @Query("system") querySystem?: string,
    ) {
        const system = this.resolveSystem(querySystem, userSystem);
        return this.auditQuery.getStats(system);
    }

    /**
     * GET /audit/:id
     * Obtiene un log específico por ID
     */
    @Get(":id")
    @RequirePermission("/audit", "READ")
    @ResponseMessage("Log de auditoría obtenido")
    async findOne(@Param("id") id: string) {
        return this.auditQuery.findOne(id);
    }
}
