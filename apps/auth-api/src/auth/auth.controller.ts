import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type { SystemType } from "@common/types/system";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { PasswordService } from "./services/password.service";
import { VerificationService } from "./services/verification.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { LoginDto } from "./dto/login.dto";
import { setAuthCookies, clearAuthCookies } from "./cookies";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ResponseMessage } from "../common/decorators/response-message.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private auth: AuthService,
    private passwordService: PasswordService,
    private verificationService: VerificationService,
    private cfg: ConfigService
  ) { }

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
    const result = await this.auth.register(
      dto.email,
      dto.password,
      dto.documentNumber,
      dto.firstName,
      dto.lastName,
      dto.system,
      requestId
    );
    return { id: result.user.id, email: result.user.email, isNewUser: result.isNewUser };
  }

  @Post("verify-email")
  @ResponseMessage("Email verificado correctamente")
  async verify(@Body() dto: VerifyEmailDto) {
    return this.verificationService.verifyEmail(dto.email, dto.code, dto.system);
  }

  @Post("resend-verification")
  @ResponseMessage("Código reenviado correctamente")
  async resend(@Body() dto: ResendVerificationDto) {
    return this.verificationService.resendVerificationCode(dto.email, dto.system);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Contraseña actualizada correctamente")
  async changePassword(@CurrentUser("sub") userId: string, @CurrentUser("system") system: SystemType, @Body() dto: ChangePasswordDto) {
    return this.passwordService.changePassword(userId, dto.currentPassword, dto.newPassword, system);
  }

  @Post("forgot-password")
  @ResponseMessage("Solicitud procesada")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(dto.email, dto.system);
  }

  @Post("reset-password")
  @ResponseMessage("Contraseña restablecida correctamente")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordService.resetPassword(dto.email, dto.code, dto.newPassword, dto.system);
  }

  @Post("login")
  @ResponseMessage("Inicio de sesión exitoso")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto.email, dto.password, dto.system);
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
  async logout(@CurrentUser("sub") userId: string, @CurrentUser("system") system: SystemType, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.["refresh_token"];
    await this.auth.logout(userId, system, rt);
    clearAuthCookies(res, this.cookieOpts());
    return null;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ResponseMessage("Perfil de usuario obtenido")
  async me(@CurrentUser("sub") userId: string, @CurrentUser("system") system: SystemType) {
    return this.auth.me(userId, system);
  }
}
