import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "permission";

export interface PermissionMetadata {
    modulePath: string;
    actionCode: string;
}

export const RequirePermission = (modulePath: string, actionCode: string) =>
    SetMetadata<string, PermissionMetadata>(PERMISSION_KEY, { modulePath, actionCode });
