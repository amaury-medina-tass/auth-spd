import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { User } from "@common/entities/user.entity";
import { Role } from "@common/entities/role.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { RefreshToken } from "@common/entities/refresh-token.entity";
import { ActionEntity } from "@common/entities/action.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { hashPassword, verifyPassword } from "@common/security/password";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { OutboxService } from "../outbox/outbox.service";
import { TokenService, PermissionsPayload } from "./services/token.service";
import { VerificationService } from "./services/verification.service";

type ActionPermissions = { [actionCode: string]: { name: string; allowed: boolean } };

interface UserPermissionRow {
  module_path: string;
  module_name: string;
  action_code: string;
}

interface ActionInfo {
  code: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokens: Repository<RefreshToken>,
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    private dataSource: DataSource,
    private outbox: OutboxService,
    private tokenService: TokenService,
    private verificationService: VerificationService
  ) { }

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRolesData = await this.userRoles.find({
      where: { user_id: userId, role: { is_active: true } },
      relations: ['role'],
    });
    return userRolesData.map((ur) => ur.role.name);
  }

  private async getUserPermissions(userId: string, system: SystemType): Promise<PermissionsPayload> {
    // Get modules filtered by system OR PUBLIC
    const systemModules = await this.dataSource
      .getRepository(ModuleEntity)
      .createQueryBuilder("m")
      .select(["m.id", "m.name", "m.path"])
      .where("m.system = :system OR m.system = 'PUBLIC'", { system })
      .getMany();

    // Get which actions exist for each module in the permissions table (with names)
    const moduleActionsQuery = await this.dataSource.query<{ module_id: string; action_code: string; action_name: string }[]>(
      `
      SELECT DISTINCT p.module_id, a.code_action AS action_code, a.name AS action_name
      FROM permissions p
      JOIN actions a ON a.id = p.action_id
      JOIN modules m ON m.id = p.module_id
      WHERE (m.system = $1::modules_system_enum OR m.system = 'PUBLIC')
        AND (a.system = 'PUBLIC' OR a.system = $2::actions_system_enum)
      `,
      [system, system]
    );

    // Build a map of module_id -> available actions with their names
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
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.is_active = TRUE AND r.system = $2::roles_system_enum
      JOIN role_permissions rp ON rp.role_id = r.id AND rp.allowed = TRUE
      JOIN permissions p ON p.id = rp.permission_id
      JOIN modules m ON m.id = p.module_id AND (m.system = $3::modules_system_enum OR m.system = 'PUBLIC')
      JOIN actions a ON a.id = p.action_id AND (a.system = 'PUBLIC' OR a.system = $4::actions_system_enum)
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

      // Only include actions that exist in permissions table for this module
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
    const existingByEmail = await this.users.findOne({ where: { email } });
    const existingByDocument = await this.users.findOne({ where: { document_number } });

    if (existingByEmail && existingByDocument && existingByEmail.id !== existingByDocument.id) {
      throw new BadRequestException({ message: "Email y documento pertenecen a usuarios diferentes", code: ErrorCodes.EMAIL_ALREADY_REGISTERED });
    }

    const existingUser = existingByEmail || existingByDocument;

    if (existingUser) {
      const hasRoleInSystem = await this.userRoles.findOne({
        where: { user_id: existingUser.id, role: { system } },
        relations: ['role']
      });

      if (hasRoleInSystem) {
        throw new BadRequestException({ message: `Usuario ya registrado en el sistema ${system}`, code: ErrorCodes.EMAIL_ALREADY_REGISTERED });
      }

      await this.assignDefaultRole(existingUser.id, system);
      return { user: existingUser, isNewUser: false };
    }

    const verificationCode = this.verificationService.generateVerificationCode();

    const user = this.users.create({
      email,
      password_hash: await hashPassword(password),
      document_number,
      first_name,
      last_name,
      is_active: true,
      email_verified: false,
      verification_code: verificationCode
    });

    const saved = await this.users.save(user);

    await this.assignDefaultRole(saved.id, system);

    await this.outbox.enqueue("Auth.UserCreated", { userId: saved.id, email: saved.email }, requestId);

    await this.verificationService.sendVerificationEmail(saved, verificationCode);

    return { user: saved, isNewUser: true };
  }

  private async assignDefaultRole(userId: string, system: SystemType) {
    const role = await this.roles.findOne({ where: { is_default: true, system } });

    if (!role) {
      throw new BadRequestException({ message: `No se encontró un rol por defecto para el sistema ${system}`, code: ErrorCodes.DEFAULT_ROLE_NOT_FOUND });
    }

    await this.userRoles.save({
      user_id: userId,
      role_id: role.id
    });
  }

  async login(email: string, password: string, system: SystemType) {
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException({ message: "Credenciales inválidas", code: ErrorCodes.INVALID_CREDENTIALS });

    if (!user.is_active) throw new UnauthorizedException({ message: "Usuario inactivo", code: ErrorCodes.USER_INACTIVE });

    if (!user.email_verified) throw new UnauthorizedException({ message: "Email no verificado", code: ErrorCodes.EMAIL_NOT_VERIFIED, email: user.email });

    const hasActiveRoleInSystem = await this.userRoles.findOne({
      where: { user_id: user.id, role: { system, is_active: true } },
      relations: ['role']
    });

    if (!hasActiveRoleInSystem) throw new UnauthorizedException({ message: `Usuario no tiene un rol activo en el sistema ${system}`, code: ErrorCodes.NOT_REGISTERED_IN_SYSTEM });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new UnauthorizedException({ message: "Credenciales inválidas", code: ErrorCodes.INVALID_CREDENTIALS });

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(user.id, system),
      this.getUserRoles(user.id)
    ]);

    const accessToken = await this.tokenService.signAccessToken(user, roles, permissions, system);
    const refreshToken = await this.tokenService.signRefreshToken(user, system);

    await this.tokenService.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async me(userId: string, system: SystemType) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(userId, system),
      this.getUserRoles(userId)
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

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(userId, refreshToken);
    } else {
      await this.tokenService.revokeAllUserTokens(userId);
    }
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const decoded: any = await this.tokenService.verifyRefreshToken(refreshToken);

    const userId = decoded.sub as string;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.is_active) throw new UnauthorizedException({ message: "Usuario inactivo", code: ErrorCodes.USER_INACTIVE });

    const validRow = await this.tokenService.findValidRefreshTokenRow(userId, refreshToken);
    if (!validRow) throw new UnauthorizedException({ message: "Token de refresco revocado o inválido", code: ErrorCodes.REFRESH_TOKEN_REVOKED });

    await this.refreshTokens.update({ id: validRow.id }, { revoked: true, updated_at: new Date() });

    const system = decoded.system as SystemType;

    const [permissions, roles] = await Promise.all([
      this.getUserPermissions(user.id, system),
      this.getUserRoles(user.id)
    ]);

    const newAccess = await this.tokenService.signAccessToken(user, roles, permissions, system);
    const newRefresh = await this.tokenService.signRefreshToken(user, system);
    await this.tokenService.storeRefreshToken(userId, newRefresh);

    return { user, accessToken: newAccess, refreshToken: newRefresh };
  }
}