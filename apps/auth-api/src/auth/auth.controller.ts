import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { setAuthCookies, clearAuthCookies } from "./cookies";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ResponseMessage } from "../common/decorators/response-message.decorator";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService, private cfg: ConfigService) {}

  private cookieOpts() {
    return {
      secure: this.cfg.get<boolean>("cookies.secure") ?? false,
      sameSite: this.cfg.get<"lax" | "strict" | "none">("cookies.sameSite") ?? "lax",
      domain: this.cfg.get<string | undefined>("cookies.domain")
    };
  }

  @Post("register")
  @ResponseMessage("Usuario registrado exitosamente")
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const requestId = req.headers["x-request-id"] as string;
    const user = await this.auth.register(
      dto.email,
      dto.password,
      dto.documentNumber,
      dto.firstName,
      dto.lastName,
      requestId
    );
    return { id: user.id, email: user.email };
  }

  @Post("login")
  @ResponseMessage("Inicio de sesión exitoso")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto.email, dto.password);
    setAuthCookies(res, { accessToken, refreshToken, ...this.cookieOpts() });
    return { id: user.id, email: user.email };
  }

  @Post("refresh")
  @ResponseMessage("Sesión renovada correctamente")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.["refresh_token"];
    if (!rt) return { ok: false };

    const { user, accessToken, refreshToken } = await this.auth.refresh(rt);
    setAuthCookies(res, { accessToken, refreshToken, ...this.cookieOpts() });

    return { id: user.id, email: user.email };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Sesión cerrada correctamente")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.["refresh_token"];
    await this.auth.logout(req.user.sub, rt);
    clearAuthCookies(res, this.cookieOpts());
    return null;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Perfil de usuario obtenido")
  async me(@Req() req: any) {
    return this.auth.me(req.user.sub);
  }
}