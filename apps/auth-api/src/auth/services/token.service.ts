import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

import { BaseUser } from "@common/entities/base/base-user.entity";
import { RefreshTokenSpd } from "@common/entities/spd/refresh-token.entity";
import { RefreshTokenSicgem } from "@common/entities/sicgem/refresh-token.entity";
import { hashToken, verifyToken } from "@common/security/token-hash";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";

type ActionPermissions = { [actionCode: string]: { name: string; allowed: boolean } };
interface ModulePermissions {
    name: string;
    actions: ActionPermissions;
}
export type PermissionsPayload = { [modulePath: string]: ModulePermissions };

@Injectable()
export class TokenService {
    constructor(
        @InjectRepository(RefreshTokenSpd) private readonly repoSpd: Repository<RefreshTokenSpd>,
        @InjectRepository(RefreshTokenSicgem) private readonly repoSicgem: Repository<RefreshTokenSicgem>,
        private readonly jwt: JwtService,
        private readonly cfg: ConfigService
    ) { }

    private getRepo(system: SystemType): Repository<any> {
        if (system === 'SPD') return this.repoSpd;
        if (system === 'SICGEM') return this.repoSicgem;
        throw new BadRequestException(`Sistema no válido para tokens: ${system}`);
    }

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

    async signAccessToken(user: BaseUser, roles: string[], system?: string) {
        const fullName = `${user.first_name} ${user.last_name}`.trim();

        return this.jwt.signAsync(
            {
                sub: user.id,
                email: user.email,
                name: fullName,
                ...(system && { system }),
                roles
            },
            { algorithm: "RS256", privateKey: this.accessPrivateKey(), expiresIn: this.accessExpiresIn() as any }
        );
    }

    async signRefreshToken(user: BaseUser, system: string) {
        const jti = randomUUID();
        return this.jwt.signAsync(
            { sub: user.id, jti, system },
            { algorithm: "RS256", privateKey: this.refreshPrivateKey(), expiresIn: this.refreshExpiresIn() as any }
        );
    }

    async verifyRefreshToken(token: string) {
        try {
            return await this.jwt.verifyAsync(token, {
                algorithms: ["RS256"],
                publicKey: this.refreshPublicKey()
            });
        } catch {
            throw new UnauthorizedException({ message: "Token de refresco inválido", code: ErrorCodes.INVALID_REFRESH_TOKEN });
        }
    }

    async storeRefreshToken(userId: string, token: string, system: SystemType) {
        const expiresAt = this.computeRefreshExpiry();
        const repo = this.getRepo(system);

        await repo.insert({
            user_id: userId,
            token_hash: await hashToken(token),
            revoked: false,
            expires_at: expiresAt
        });
    }

    private computeRefreshExpiry(): Date {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
    }

    async findValidRefreshTokenRow(userId: string, raw: string, system: SystemType) {
        const repo = this.getRepo(system);
        const rows = await repo.find({
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

    async revokeRefreshToken(userId: string, raw: string, system: SystemType) {
        const row = await this.findValidRefreshTokenRow(userId, raw, system);
        if (!row) return;
        const repo = this.getRepo(system);
        await repo.update({ id: row.id }, { revoked: true, updated_at: new Date() });
    }

    async revokeAllUserTokens(userId: string, system: SystemType) {
        const repo = this.getRepo(system);
        await repo.update({ user_id: userId }, { revoked: true, updated_at: new Date() });
    }
}
