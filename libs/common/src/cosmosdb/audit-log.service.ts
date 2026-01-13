import { Injectable, Inject, Logger, Optional } from "@nestjs/common";
import { Database, Container } from "@azure/cosmos";
import {
    AuditLogEntry,
    AuditAction,
    AuditActor,
    AuditChange,
    AuditError,
    getActionLabel,
    AuditEntityType,
} from "@common/types/audit.types";

export const COSMOS_DATABASE = "COSMOS_DATABASE";
export const COSMOS_CONTAINER_NAME = "COSMOS_CONTAINER_NAME";

// Re-export types for convenience
export type { AuditLogEntry, AuditActor, AuditChange, AuditError };
export { AuditAction, getActionLabel, AuditEntityType };

export interface LogOptions {
    entityName?: string;
    actor?: AuditActor;
    system?: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: AuditChange[];
    error?: AuditError;
    metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);
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
            this.logger.warn("CosmosDB not configured, audit logging disabled");
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
            this.logger.log(`Audit log container initialized: ${this.containerName}`);
        } catch (error) {
            this.initialized = true;
            this.logger.error(`Failed to initialize audit container: ${error}`);
        }
    }

    /**
     * Log any audit entry with full details
     */
    async log(
        action: AuditAction,
        entityType: AuditEntityType,
        entityId: string,
        success: boolean,
        options?: LogOptions
    ): Promise<void> {
        // Esperar a que el contenedor esté inicializado
        if (!this.initialized) {
            await this.initPromise;
        }

        const logEntry: AuditLogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            action,
            actionLabel: getActionLabel(action),
            success,
            entityType,
            entityId,
            entityName: options?.entityName,
            actor: options?.actor,
            system: options?.system,
            ipAddress: options?.ipAddress,
            userAgent: options?.userAgent,
            changes: options?.changes,
            error: options?.error,
            metadata: options?.metadata,
        };

        if (!this.container) {
            this.logger.debug(`[MOCK AUDIT] ${logEntry.actionLabel} on ${entityType}:${entityId} success=${success}`);
            return;
        }

        try {
            await this.container.items.create(logEntry);
            this.logger.debug(`Audit logged: ${logEntry.actionLabel} on ${entityType}:${entityId}`);
        } catch (error) {
            this.logger.error(`Failed to log audit entry: ${error}`);
        }
    }

    /**
     * Log a successful action
     */
    async logSuccess(
        action: AuditAction,
        entityType: AuditEntityType,
        entityId: string,
        options?: Omit<LogOptions, "error">
    ): Promise<void> {
        await this.log(action, entityType, entityId, true, options);
    }

    /**
     * Log a failed action with error details
     */
    async logError(
        action: AuditAction,
        entityType: AuditEntityType,
        entityId: string,
        error: AuditError,
        options?: Omit<LogOptions, "error">
    ): Promise<void> {
        await this.log(action, entityType, entityId, false, { ...options, error });
    }
}
