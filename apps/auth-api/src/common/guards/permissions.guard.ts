import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsResolverService } from "../../auth/services/permissions-resolver.service";
import { PERMISSION_KEY, PermissionMetadata } from "../decorators/require-permission.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsResolver: PermissionsResolverService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const permission = this.reflector.getAllAndOverride<PermissionMetadata>(PERMISSION_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        // If no permission decorator, allow access
        if (!permission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const userId = request.user?.sub;

        if (!userId) {
            throw new ForbiddenException({ message: "Usuario no autenticado", code: "FORBIDDEN" });
        }

        const hasPermission = await this.permissionsResolver.userHasPermission(
            userId,
            permission.modulePath,
            permission.actionCode
        );

        if (!hasPermission) {
            throw new ForbiddenException({
                message: `No tiene permiso para realizar esta acción`,
                code: "FORBIDDEN"
            });
        }

        return true;
    }
}
