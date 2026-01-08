import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import { User } from "@common/entities/user.entity";
import { Role } from "@common/entities/role.entity";
import { UserRole } from "@common/entities/user-role.entity";
import { RefreshToken } from "@common/entities/refresh-token.entity";
import { hashPassword, verifyPassword } from "@common/security/password";
import { hashToken, verifyToken } from "@common/security/token-hash";
import { OutboxService } from "../outbox/outbox.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(RefreshToken) private refreshTokens: Repository<RefreshToken>,
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    private jwt: JwtService,
    private cfg: ConfigService,
    private outbox: OutboxService
  ) {}

  private accessPrivateKey() {
    return this.cfg.get<string>("jwt.accessPrivateKey");
  }
  private accessPublicKey() {
    return this.cfg.get<string>("jwt.accessPublicKey");
  }
  private refreshPrivateKey() {
    return this.cfg.get<string>("jwt.refreshPrivateKey");
  }
  private refreshPublicKey() {
    return this.cfg.get<string>("jwt.refreshPublicKey");
  }

  private accessExpiresIn() {
    return this.cfg.get<string>("jwt.accessExpiresIn") ?? "10m";
  }
  private refreshExpiresIn() {
    return this.cfg.get<string>("jwt.refreshExpiresIn") ?? "30d";
  }

  private async signAccessToken(user: User) {
    // JwtModule ya trae RS256 + privateKey, pero lo dejamos explícito por claridad
    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { algorithm: "RS256", privateKey: this.accessPrivateKey(), expiresIn: this.accessExpiresIn() as any }
    );
  }

  private async signRefreshToken(user: User) {
    const jti = randomUUID();
    return this.jwt.signAsync(
      { sub: user.id, jti },
      { algorithm: "RS256", privateKey: this.refreshPrivateKey(), expiresIn: this.refreshExpiresIn() as any }
    );
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwt.verifyAsync(token, {
        algorithms: ["RS256"],
        publicKey: this.refreshPublicKey()
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async register(
    email: string,
    password: string,
    document_number: string,
    first_name: string,
    last_name: string,
    requestId: string
  ) {
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new BadRequestException("Email already registered");

    const user = this.users.create({
      email,
      password_hash: await hashPassword(password),
      document_number,
      first_name,
      last_name,
      is_active: true
    });

    const saved = await this.users.save(user);

    await this.assignDefaultRole(saved.id);

    await this.outbox.enqueue("Auth.UserCreated", { userId: saved.id, email: saved.email }, requestId);

    return saved;
  }

  private async assignDefaultRole(userId: string) {
    const role = await this.roles.findOne({ where: { is_default: true } });

    if (role) {
      await this.userRoles.save({
        user_id: userId,
        role_id: role.id
      });
    }
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.is_active) throw new UnauthorizedException("Invalid credentials");

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    await this.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, is_active: user.is_active };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.revokeRefreshToken(userId, refreshToken);
    } else {
      await this.refreshTokens.update({ user_id: userId }, { revoked: true, updated_at: new Date() });
    }
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const decoded: any = await this.verifyRefreshToken(refreshToken);

    const userId = decoded.sub as string;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.is_active) throw new UnauthorizedException("User inactive");

    const validRow = await this.findValidRefreshTokenRow(userId, refreshToken);
    if (!validRow) throw new UnauthorizedException("Refresh token revoked/invalid");

    await this.refreshTokens.update({ id: validRow.id }, { revoked: true, updated_at: new Date() });

    const newAccess = await this.signAccessToken(user);
    const newRefresh = await this.signRefreshToken(user);
    await this.storeRefreshToken(userId, newRefresh);

    return { user, accessToken: newAccess, refreshToken: newRefresh };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = this.computeRefreshExpiry();
    await this.refreshTokens.insert({
      user_id: userId,
      token_hash: await hashToken(token),
      revoked: false,
      expires_at: expiresAt
    });
  }

  private computeRefreshExpiry(): Date {
    // Simple: 30 días (si quieres, lo hacemos parseando refreshExpiresIn)
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }

  private async findValidRefreshTokenRow(userId: string, raw: string) {
    const rows = await this.refreshTokens.find({
      where: { user_id: userId, revoked: false },
      order: { created_at: "DESC" },
      take: 10
    });

    const now = new Date();
    for (const row of rows) {
      if (row.expires_at <= now) continue;
      const ok = await verifyToken(raw, row.token_hash);
      if (ok) return row;
    }
    return null;
  }

  private async revokeRefreshToken(userId: string, raw: string) {
    const row = await this.findValidRefreshTokenRow(userId, raw);
    if (!row) return;
    await this.refreshTokens.update({ id: row.id }, { revoked: true, updated_at: new Date() });
  }
}