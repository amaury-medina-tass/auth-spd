import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { RedisService } from "@common/redis/redis.service";

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.["access_token"] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService, private redisService: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      algorithms: ["RS256"],
      secretOrKey: cfg.get<string>("jwt.accessPublicKey")!
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const permissionsJson = await this.redisService.get(`user_permissions:${userId}`);

    if (!permissionsJson) {
      throw new UnauthorizedException("Sesión expirada o inválida (permisos no encontrados)");
    }

    const permissions = JSON.parse(permissionsJson);
    return { ...payload, permissions };
  }
}