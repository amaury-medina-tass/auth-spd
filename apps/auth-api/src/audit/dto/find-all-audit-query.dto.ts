import { AuditAction } from "@common/types/audit.types";

export class FindAllAuditQueryDto {
    system?: string;
    page?: string;
    limit?: string;
    entityType?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: "timestamp" | "action" | "entityType";
    sortOrder?: "ASC" | "DESC";
}
