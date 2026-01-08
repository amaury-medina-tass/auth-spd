import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.["access_token"] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      algorithms: ["RS256"],
      secretOrKey: cfg.get<string>("jwt.accessPublicKey")
    });
  }

  async validate(payload: any) {
    return payload; // { sub, email, ... }
  }
}