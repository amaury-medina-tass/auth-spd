import { Request } from "express";
import { SystemType } from "@common/types/system";

export interface JwtPayload {
    sub: string;
    email: string;
    name: string;
    system: SystemType;
    roles: string[];
    permissions: Record<string, any>;
    iat?: number;
    exp?: number;
}

export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}
