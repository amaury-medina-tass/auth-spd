import { SetMetadata } from "@nestjs/common";

export const REQUIRE_PERMISSION_KEY = "require_permission";

export type RequiredPermission = {
  modulePath: string;
  action: string;
};

export const RequirePermission = (perm: RequiredPermission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, perm);