import { Injectable, Inject, Logger, Optional, OnModuleInit } from "@nestjs/common";
import { Database, Container, SqlQuerySpec } from "@azure/cosmos";
import { COSMOS_DATABASE, COSMOS_CONTAINER_NAME, COSMOS_CORE_CONTAINER_NAME } from "@common/cosmosdb";
import { AuditLogEntry, AuditAction } from "@common/types/audit.types";

export interface AuditLogQueryOptions {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: AuditAction;
    system?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    sortBy?: "timestamp" | "action" | "entityType";
    sortOrder?: "ASC" | "DESC";
}

export interface PaginatedAuditLogs {
    data: AuditLogEntry[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

/**
 * Mapeo de system → nombre del container en CosmosDB.
 * Cada microservicio escribe en su propio container;
 * este servicio resuelve cuál consultar según el sistema solicitado.
 */
const SYSTEM_CONTAINER_MAP: Record<string, "auth" | "core"> = {
    AUTH: "auth",
    SPD: "core",
};

@Injectable()
export class AuditQueryService implements OnModuleInit {
    private readonly logger = new Logger(AuditQueryService.name);
    private readonly containers = new Map<string, Container>();
    private readonly authContainerName: string;
    private readonly coreContainerName: string;
    private initPromise: Promise<void>;
    private initialized = false;

    constructor(
        @Optional() @Inject(COSMOS_DATABASE) private readonly database: Database | null,
        @Optional() @Inject(COSMOS_CONTAINER_NAME) authContainerName: string | null,
        @Optional() @Inject(COSMOS_CORE_CONTAINER_NAME) coreContainerName: string | null,
    ) {
        this.authContainerName = authContainerName || "auth_logs";
        this.coreContainerName = coreContainerName || "spd_core_logs";
    }

    async onModuleInit() {
        this.initPromise = this.initializeContainers();
    }

    private async initializeContainers(): Promise<void> {
        if (!this.database) {
            this.logger.warn("CosmosDB not configured, audit queries disabled");
            this.initialized = true;
            return;
        }

        try {
            for (const [key, name] of [["auth", this.authContainerName], ["core", this.coreContainerName]] as const) {
                const { container } = await this.database.containers.createIfNotExists({
                    id: name,
                    partitionKey: { paths: ["/entityType"] },
                });
                this.containers.set(key, container);
                this.logger.log(`Audit query container initialized: ${name} (${key})`);
            }
            this.initialized = true;
        } catch (error) {
            this.initialized = true;
            this.logger.error(`Failed to initialize audit containers: ${error}`);
        }
    }

    /**
     * Resuelve el container correcto según el sistema solicitado.
     * Si no se especifica sistema, devuelve el container de auth (default).
     */
    private getContainer(system?: string): Container | null {
        if (!system) return this.containers.get("auth") || null;
        const key = SYSTEM_CONTAINER_MAP[system] || "auth";
        return this.containers.get(key) || null;
    }

    async findAll(options: AuditLogQueryOptions = {}): Promise<PaginatedAuditLogs> {
        if (!this.initialized) {
            await this.initPromise;
        }

        const container = this.getContainer(options.system);
        if (!container) {
            return this.emptyResult(options.page || 1, options.limit || 20);
        }

        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;

        // Build query conditions
        const conditions: string[] = ["1=1"];
        const parameters: { name: string; value: any }[] = [];

        if (options.entityType) {
            conditions.push("c.entityType = @entityType");
            parameters.push({ name: "@entityType", value: options.entityType });
        }

        if (options.action) {
            conditions.push("c.action = @action");
            parameters.push({ name: "@action", value: options.action });
        }

        if (options.startDate) {
            conditions.push("c.timestamp >= @startDate");
            parameters.push({ name: "@startDate", value: options.startDate.toISOString() });
        }

        if (options.endDate) {
            conditions.push("c.timestamp <= @endDate");
            parameters.push({ name: "@endDate", value: options.endDate.toISOString() });
        }

        if (options.search) {
            conditions.push("(CONTAINS(LOWER(c.entityName), @search) OR CONTAINS(LOWER(c.actionLabel), @search))");
            parameters.push({ name: "@search", value: options.search.toLowerCase() });
        }

        const whereClause = conditions.join(" AND ");
        const sortBy = options.sortBy || "timestamp";
        const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";

        try {
            // Get total count
            const countQuery: SqlQuerySpec = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
                parameters
            };
            const { resources: countResult } = await container.items.query(countQuery).fetchAll();
            const total = countResult[0] || 0;

            // Get paginated data
            const dataQuery: SqlQuerySpec = {
                query: `SELECT * FROM c WHERE ${whereClause} ORDER BY c.${sortBy} ${sortOrder} OFFSET @offset LIMIT @limit`,
                parameters: [
                    ...parameters,
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            };
            const { resources: data } = await container.items.query<AuditLogEntry>(dataQuery).fetchAll();

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
        } catch (error) {
            this.logger.error(`Failed to query audit logs: ${error}`);
            return this.emptyResult(page, limit);
        }
    }

    async findOne(id: string): Promise<AuditLogEntry | null> {
        if (!this.initialized) {
            await this.initPromise;
        }

        const query: SqlQuerySpec = {
            query: "SELECT * FROM c WHERE c.id = @id",
            parameters: [{ name: "@id", value: id }]
        };

        // Buscar en todos los containers ya que no sabemos de cuál viene
        for (const container of this.containers.values()) {
            try {
                const { resources } = await container.items.query<AuditLogEntry>(query).fetchAll();
                if (resources[0]) return resources[0];
            } catch (error) {
                this.logger.error(`Failed to get audit log by id from container: ${error}`);
            }
        }

        return null;
    }

    async getStats(system?: string): Promise<{ byAction: Record<string, number>; byEntityType: Record<string, number>; total: number }> {
        if (!this.initialized) {
            await this.initPromise;
        }

        const container = this.getContainer(system);
        if (!container) {
            return { byAction: {}, byEntityType: {}, total: 0 };
        }

        try {
            // Count by action
            const actionQuery: SqlQuerySpec = {
                query: `SELECT c.action, COUNT(1) as count FROM c GROUP BY c.action`,
                parameters: []
            };
            const { resources: actionStats } = await container.items.query<{ action: string; count: number }>(actionQuery).fetchAll();

            // Count by entity type
            const entityQuery: SqlQuerySpec = {
                query: `SELECT c.entityType, COUNT(1) as count FROM c GROUP BY c.entityType`,
                parameters: []
            };
            const { resources: entityStats } = await container.items.query<{ entityType: string; count: number }>(entityQuery).fetchAll();

            const byAction: Record<string, number> = {};
            for (const stat of actionStats) {
                byAction[stat.action] = stat.count;
            }

            const byEntityType: Record<string, number> = {};
            for (const stat of entityStats) {
                byEntityType[stat.entityType] = stat.count;
            }

            const total = Object.values(byAction).reduce((a, b) => a + b, 0);

            return { byAction, byEntityType, total };
        } catch (error) {
            this.logger.error(`Failed to get audit stats: ${error}`);
            return { byAction: {}, byEntityType: {}, total: 0 };
        }
    }

    private emptyResult(page: number, limit: number): PaginatedAuditLogs {
        return {
            data: [],
            meta: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false
            }
        };
    }
}
