import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { Database, Container, SqlQuerySpec } from "@azure/cosmos";
import { COSMOS_DATABASE, COSMOS_CONTAINER_NAME } from "@common/cosmosdb";
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

@Injectable()
export class AuditQueryService {
    private readonly logger = new Logger(AuditQueryService.name);
    private container: Container | null = null;
    private containerName: string;
    private initPromise: Promise<void>;
    private initialized = false;

    constructor(
        @Optional() @Inject(COSMOS_DATABASE) private database: Database | null,
        @Optional() @Inject(COSMOS_CONTAINER_NAME) containerName: string | null
    ) {
        this.containerName = containerName || "audit_logs";
        this.initPromise = this.initializeContainer();
    }

    private async initializeContainer(): Promise<void> {
        if (!this.database) {
            this.logger.warn("CosmosDB not configured, audit queries disabled");
            this.initialized = true;
            return;
        }

        try {
            const { container } = await this.database.containers.createIfNotExists({
                id: this.containerName,
                partitionKey: { paths: ["/entityType"] }
            });
            this.container = container;
            this.initialized = true;
            this.logger.log(`Audit query container initialized: ${this.containerName}`);
        } catch (error) {
            this.initialized = true;
            this.logger.error(`Failed to initialize audit container: ${error}`);
        }
    }

    async findAll(options: AuditLogQueryOptions = {}): Promise<PaginatedAuditLogs> {
        if (!this.initialized) {
            await this.initPromise;
        }

        if (!this.container) {
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

        if (options.system) {
            conditions.push("c.system = @system");
            parameters.push({ name: "@system", value: options.system });
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
            const { resources: countResult } = await this.container.items.query(countQuery).fetchAll();
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
            const { resources: data } = await this.container.items.query<AuditLogEntry>(dataQuery).fetchAll();

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

        if (!this.container) {
            return null;
        }

        try {
            const query: SqlQuerySpec = {
                query: "SELECT * FROM c WHERE c.id = @id",
                parameters: [{ name: "@id", value: id }]
            };
            const { resources } = await this.container.items.query<AuditLogEntry>(query).fetchAll();
            return resources[0] || null;
        } catch (error) {
            this.logger.error(`Failed to get audit log by id: ${error}`);
            return null;
        }
    }

    async getStats(system?: string): Promise<{ byAction: Record<string, number>; byEntityType: Record<string, number>; total: number }> {
        if (!this.initialized) {
            await this.initPromise;
        }

        if (!this.container) {
            return { byAction: {}, byEntityType: {}, total: 0 };
        }

        try {
            const whereClause = system ? "WHERE c.system = @system" : "";
            const parameters = system ? [{ name: "@system", value: system }] : [];

            // Count by action
            const actionQuery: SqlQuerySpec = {
                query: `SELECT c.action, COUNT(1) as count FROM c ${whereClause} GROUP BY c.action`,
                parameters
            };
            const { resources: actionStats } = await this.container.items.query<{ action: string; count: number }>(actionQuery).fetchAll();

            // Count by entity type
            const entityQuery: SqlQuerySpec = {
                query: `SELECT c.entityType, COUNT(1) as count FROM c ${whereClause} GROUP BY c.entityType`,
                parameters
            };
            const { resources: entityStats } = await this.container.items.query<{ entityType: string; count: number }>(entityQuery).fetchAll();

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
