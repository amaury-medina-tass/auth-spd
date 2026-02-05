import { Controller, Get, Query, Param, UseGuards, ForbiddenException } from "@nestjs/common";
import type { SystemType } from "@common/types/system";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import { AuditQueryService, AuditLogQueryOptions } from "./audit-query.service";
import { AuditAction } from "@common/types/audit.types";

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
        @Query("system") querySystem?: string,
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("entityType") entityType?: string,
        @Query("action") action?: AuditAction,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string,
        @Query("search") search?: string,
        @Query("sortBy") sortBy?: "timestamp" | "action" | "entityType",
        @Query("sortOrder") sortOrder?: "ASC" | "DESC"
    ) {
        const system = this.resolveSystem(querySystem, userSystem);

        const options: AuditLogQueryOptions = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
            entityType,
            action,
            system,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            search,
            sortBy,
            sortOrder
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
