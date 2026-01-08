import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_PERMISSION_KEY, RequiredPermission } from "../decorators/require-permission.decorator";
import { PermissionsResolverService } from "../permissions-resolver.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private resolver: PermissionsResolverService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRE_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()]
    );

    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: string } | undefined;
    if (!user?.sub) return false;

    return this.resolver.userHasPermission(user.sub, required.modulePath, required.action);
  }
}