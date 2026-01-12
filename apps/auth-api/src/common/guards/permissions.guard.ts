import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsResolverService } from "../../auth/services/permissions-resolver.service";
import { PERMISSION_KEY, PermissionMetadata } from "../decorators/require-permission.decorator";
import { SystemType } from "@common/types/system";
import { ErrorCodes } from "@common/errors/error-codes";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsResolver: PermissionsResolverService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub;
        const system = request.user?.system as SystemType;

        if (!userId || !system) {
            throw new ForbiddenException({ message: "Usuario no autenticado", code: ErrorCodes.FORBIDDEN });
        }

        // Verify user has at least one active role in this system
        const hasActiveRole = await this.permissionsResolver.hasActiveRoleInSystem(userId, system);
        if (!hasActiveRole) {
            throw new ForbiddenException({
                message: "No tiene un rol activo en este sistema",
                code: ErrorCodes.NO_ACTIVE_ROLE
            });
        }

        const permission = this.reflector.getAllAndOverride<PermissionMetadata>(PERMISSION_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        // If no permission decorator, allow access (user just needs active role)
        if (!permission) {
            return true;
        }

        const hasPermission = await this.permissionsResolver.userHasPermission(
            userId,
            permission.modulePath,
            permission.actionCode,
            system
        );

        if (!hasPermission) {
            throw new ForbiddenException({
                message: `No tiene permiso para realizar esta acción`,
                code: ErrorCodes.FORBIDDEN
            });
        }

        return true;
    }
}
