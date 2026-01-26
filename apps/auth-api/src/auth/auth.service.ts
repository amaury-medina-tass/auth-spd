import { BadRequestException, Injectable, UnauthorizedException, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { BaseUser } from "@common/entities/base/base-user.entity";
import { BaseRole } from "@common/entities/base/base-role.entity";

import { UserSpd } from "@common/entities/spd/user.entity";
import { RoleSpd } from "@common/entities/spd/role.entity";
import { UserRoleSpd } from "@common/entities/spd/user-role.entity";
import { RefreshTokenSpd } from "@common/entities/spd/refresh-token.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { RoleSicgem } from "@common/entities/sicgem/role.entity";
import { UserRoleSicgem } from "@common/entities/sicgem/user-role.entity";
import { RefreshTokenSicgem } from "@common/entities/sicgem/refresh-token.entity";

import { hashPassword, verifyPassword } from "@common/security/password";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { OutboxService } from "../outbox/outbox.service";
import { TokenService, PermissionsPayload } from "./services/token.service";
import { VerificationService } from "./services/verification.service";
import { RedisService } from "@common/redis/redis.service";

type ActionPermissions = { [actionCode: string]: { name: string; allowed: boolean } };

interface UserPermissionRow {
  module_path: string;
  module_name: string;
  action_code: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserSpd) private userRepoSpd: Repository<UserSpd>,
    @InjectRepository(UserSicgem) private userRepoSicgem: Repository<UserSicgem>,

    @InjectRepository(RoleSpd) private roleRepoSpd: Repository<RoleSpd>,
    @InjectRepository(RoleSicgem) private roleRepoSicgem: Repository<RoleSicgem>,

    @InjectRepository(UserRoleSpd) private userRoleRepoSpd: Repository<UserRoleSpd>,
    @InjectRepository(UserRoleSicgem) private userRoleRepoSicgem: Repository<UserRoleSicgem>,

    // Note: RefreshToken repos injected in TokenService, but if needed here we can inject.
    // However, AuthService mainly uses TokenService for token ops.
    // Except maybe cleaning up? AuthService uses TokenService.revoke...

    private dataSource: DataSource,
    private outbox: OutboxService,
    private tokenService: TokenService,
    private verificationService: VerificationService,
    private redisService: RedisService
  ) { }

  private getRepo(system: SystemType): Repository<BaseUser> {
    if (system === 'SPD') return this.userRepoSpd as unknown as Repository<BaseUser>;
    if (system === 'SICGEM') return this.userRepoSicgem as unknown as Repository<BaseUser>;
    throw new BadRequestException("Sistema inválido");
  }

  private getUserRoleRepo(system: SystemType): Repository<any> {
    if (system === 'SPD') return this.userRoleRepoSpd;
    if (system === 'SICGEM') return this.userRoleRepoSicgem;
    throw new BadRequestException("Sistema inválido");
  }

  private getRoleRepo(system: SystemType): Repository<BaseRole> {
    if (system === 'SPD') return this.roleRepoSpd as unknown as Repository<BaseRole>;
    if (system === 'SICGEM') return this.roleRepoSicgem as unknown as Repository<BaseRole>;
    throw new BadRequestException("Sistema inválido");
  }


  private async getUserRoles(userId: string, system: SystemType): Promise<string[]> {
    const userRoleRepo = this.getUserRoleRepo(system);
    // UserRoleSpd/Sicgem relations: user, role.
    const userRolesData = await userRoleRepo.find({
      where: { user_id: userId, role: { is_active: true } },
      relations: ['role'],
    });
    return userRolesData.map((ur: any) => ur.role.name);
  }

  private async getUserPermissions(userId: string, system: SystemType): Promise<PermissionsPayload> {
    const schema = system.toLowerCase();

    // Get modules filtered by system OR PUBLIC
    const systemModules = await this.dataSource.query<{ id: string; name: string; path: string }[]>(
      `
      SELECT id, name, path 
      FROM ${schema}.modules m
      WHERE m.system = $1::${schema}.modules_system_enum OR m.system = 'PUBLIC'
      `,
      [system]
    );

    // Get which actions exist for each module in the permissions table (with names)
    const moduleActionsQuery = await this.dataSource.query<{ module_id: string; action_code: string; action_name: string }[]>(
      `
      SELECT DISTINCT p.module_id, a.code_action AS action_code, a.name AS action_name
      FROM ${schema}.permissions p
      JOIN ${schema}.actions a ON a.id = p.action_id
      JOIN ${schema}.modules m ON m.id = p.module_id
      WHERE (m.system = $1::${schema}.modules_system_enum OR m.system = 'PUBLIC')
        AND (a.system = 'PUBLIC' OR a.system = $2::${schema}.actions_system_enum)
      `,
      [system, system]
    );

    const moduleActionsMap = new Map<string, Map<string, string>>();
    for (const row of moduleActionsQuery) {
      if (!moduleActionsMap.has(row.module_id)) {
        moduleActionsMap.set(row.module_id, new Map());
      }
      moduleActionsMap.get(row.module_id)!.set(row.action_code, row.action_name);
    }

    // Get user's granted permissions
    const userPermissions = await this.dataSource.query<UserPermissionRow[]>(
      `
      SELECT
        m.path AS module_path,
        m.name AS module_name,
        a.code_action AS action_code
      FROM ${schema}.users u
      JOIN ${schema}.user_roles ur ON ur.user_id = u.id
      JOIN ${schema}.roles r ON r.id = ur.role_id AND r.is_active = TRUE AND r.system = $2::${schema}.roles_system_enum
      JOIN ${schema}.role_permissions rp ON rp.role_id = r.id AND rp.allowed = TRUE
      JOIN ${schema}.permissions p ON p.id = rp.permission_id
      JOIN ${schema}.modules m ON m.id = p.module_id AND (m.system = $3::${schema}.modules_system_enum OR m.system = 'PUBLIC')
      JOIN ${schema}.actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $4::${schema}.actions_system_enum)
      WHERE u.id = $1 AND u.is_active = TRUE
      `,
      [userId, system, system, system]
    );

    const permissionSet = new Set(
      userPermissions.map((p) => `${p.module_path}:${p.action_code}`)
    );

    const permissions: PermissionsPayload = {};
    for (const mod of systemModules) {
      const availableActions = moduleActionsMap.get(mod.id) || new Map<string, string>();
      const actions: ActionPermissions = {};

      for (const [actionCode, actionName] of availableActions) {
        actions[actionCode] = {
          name: actionName,
          allowed: permissionSet.has(`${mod.path}:${actionCode}`)
        };
      }

      permissions[mod.path] = {
        name: mod.name,
        actions
      };
    }

    return permissions;
  }

  async register(
    email: string,
    password: string,
    document_number: string,
    first_name: string,
    last_name: string,
    system: SystemType,
    requestId: string
  ) {
    const repo = this.getRepo(system);
    const existingByEmail = await repo.findOne({ where: { email } } as any);
    const existingByDocument = await repo.findOne({ where: { document_number } } as any);

    if (existingByEmail && existingByDocument && existingByEmail.id !== existingByDocument.id) {
      throw new BadRequestException({ message: "Email y documento pertenecen a usuarios diferentes", code: ErrorCodes.EMAIL_ALREADY_REGISTERED });
    }

    const existingUser = existingByEmail || existingByDocument;

    if (existingUser) {
      // User exists in this schema/system.
      // We cannot register again.
      // If caller wants to add role, they should use AddRole endpoint, not Register.
      // Original logic checked if they had a role in this system. But now user IS in this system.
      throw new BadRequestException({ message: `Usuario ya registrado en el sistema ${system}`, code: ErrorCodes.EMAIL_ALREADY_REGISTERED });
    }

    const verificationCode = this.verificationService.generateVerificationCode();

    const user = repo.create({
      email,
      password_hash: await hashPassword(password),
      document_number,
      first_name,
      last_name,
      is_active: true,
      email_verified: false,
      verification_code: verificationCode
    });

    const saved = await repo.save(user);

    await this.assignDefaultRole(saved.id, system);

    await this.outbox.enqueue("Auth.UserCreated", { userId: saved.id, email: saved.email }, requestId, system);

    await this.verificationService.sendVerificationEmail(saved, verificationCode);

    return { user: saved, isNewUser: true };
  }

  private async assignDefaultRole(userId: string, system: SystemType) {
    const roleRepo = this.getRoleRepo(system);
    const role = await roleRepo.findOne({ where: { is_default: true, system } } as any);

    if (!role) {
      throw new BadRequestException({ message: `No se encontró un rol por defecto para el sistema ${system}`, code: ErrorCodes.DEFAULT_ROLE_NOT_FOUND });
    }

    const userRoleRepo = this.getUserRoleRepo(system);
    await userRoleRepo.save({
      user_id: userId,
      role_id: role.id
    });
  }

  async login(email: string, password: string, system: SystemType) {
    const repo = this.getRepo(system);
    const user = await repo.findOne({ where: { email } } as any);
    if (!user) throw new UnauthorizedException({ message: "Credenciales inválidas", code: ErrorCodes.INVALID_CREDENTIALS });

    if (!user.is_active) throw new UnauthorizedException({ message: "Usuario inactivo", code: ErrorCodes.USER_INACTIVE });

    if (!user.email_verified) throw new UnauthorizedException({ message: "Email no verificado", code: ErrorCodes.EMAIL_NOT_VERIFIED, email: user.email });

    // Ensure at least one active role exists for this user in this system?
    // Since we are in the schema-specific table, if they are here, they are "in the system".
    // But they might not have any role assigned? Or roles disabled?
    const userRoleRepo = this.getUserRoleRepo(system);
    const hasActiveRole = await userRoleRepo.findOne({
      where: { user_id: user.id, role: { is_active: true } },
      relations: ['role']
    });

    if (!hasActiveRole) throw new UnauthorizedException({ message: `Usuario no tiene un rol activo en el sistema ${system}`, code: ErrorCodes.NOT_REGISTERED_IN_SYSTEM });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new UnauthorizedException({ message: "Credenciales inválidas", code: ErrorCodes.INVALID_CREDENTIALS });

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(user.id, system),
      this.getUserRoles(user.id, system)
    ]);

    // Store permissions in Redis (TTL 1 hour matching access token)
    await this.redisService.set(`user_permissions:${user.id}`, JSON.stringify(permissions), 3600);

    const accessToken = await this.tokenService.signAccessToken(user, roles, system);
    const refreshToken = await this.tokenService.signRefreshToken(user, system);

    await this.tokenService.storeRefreshToken(user.id, refreshToken, system);

    return { user, accessToken, refreshToken };
  }

  async me(userId: string, system: SystemType) {
    const repo = this.getRepo(system);
    const user = await repo.findOne({ where: { id: userId } } as any);
    if (!user) throw new UnauthorizedException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(userId, system),
      this.getUserRoles(userId, system)
    ]);

    return {
      id: user.id,
      email: user.email,
      document_number: user.document_number,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      roles,
      permissions
    };
  }

  async logout(userId: string, system: SystemType, refreshToken?: string) {
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(userId, refreshToken, system);
    } else {
      await this.tokenService.revokeAllUserTokens(userId, system);
    }
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const decoded: any = await this.tokenService.verifyRefreshToken(refreshToken);
    const system = decoded.system as SystemType;

    const userId = decoded.sub as string;
    const repo = this.getRepo(system);
    const user = await repo.findOne({ where: { id: userId } } as any);

    if (!user || !user.is_active) throw new UnauthorizedException({ message: "Usuario inactivo", code: ErrorCodes.USER_INACTIVE });

    const validRow = await this.tokenService.findValidRefreshTokenRow(userId, refreshToken, system);
    if (!validRow) throw new UnauthorizedException({ message: "Token de refresco revocado o inválido", code: ErrorCodes.REFRESH_TOKEN_REVOKED });

    const repoToken = (system === 'SPD') ? (this.tokenService as any).repoSpd : (this.tokenService as any).repoSicgem; // This accessing private props is bad. 
    // Wait, TokenService handles update/revoke.
    // But here we need to mark it as revoked.
    // The original code did: this.refreshTokens.update({ id: validRow.id }, { revoked: true, updated_at: new Date() });
    // I should add a method in TokenService `revokeTokenById(id, system)`.
    // Or just `revokeRefreshToken(userId, token, system)` which I already have.
    // `revokeRefreshToken` finds the row and updates it.
    // If I already found the row, I can call `revokeRefreshToken` with raw token.

    await this.tokenService.revokeRefreshToken(userId, refreshToken, system);

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(user.id, system),
      this.getUserRoles(user.id, system)
    ]);

    // Store permissions in Redis (TTL 1 hour matching access token)
    await this.redisService.set(`user_permissions:${user.id}`, JSON.stringify(permissions), 3600);

    const newAccess = await this.tokenService.signAccessToken(user, roles, system);
    const newRefresh = await this.tokenService.signRefreshToken(user, system);
    await this.tokenService.storeRefreshToken(userId, newRefresh, system);

    return { user, accessToken: newAccess, refreshToken: newRefresh };
  }
}