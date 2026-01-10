import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User } from "@common/entities/user.entity";
import { hashPassword, verifyPassword } from "@common/security/password";
import { ErrorCodes } from "@common/errors/error-codes";
import { EmailService } from "@common/email/email.service";

@Injectable()
export class PasswordService {
    constructor(
        @InjectRepository(User) private users: Repository<User>,
        private emailService: EmailService
    ) { }

    async changePassword(userId: string, current: string, newPass: string) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user) throw new UnauthorizedException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        const ok = await verifyPassword(current, user.password_hash);
        if (!ok) throw new BadRequestException({ message: "Contraseña actual incorrecta", code: ErrorCodes.INVALID_PASSWORD });

        user.password_hash = await hashPassword(newPass);
        await this.users.save(user);

        return { ok: true, message: "Contraseña actualizada correctamente" };
    }

    async forgotPassword(email: string) {
        const user = await this.users.findOne({ where: { email } });
        if (!user) return { ok: true, message: "Si el correo existe, se enviará un código" };

        if (!user.email_verified) throw new BadRequestException({ message: "El correo no está verificado", code: ErrorCodes.EMAIL_NOT_VERIFIED_FOR_RESET });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.verification_code = code;
        await this.users.save(user);

        try {
            await this.emailService.sendTemplateEmail(
                user.email,
                "Restablecer Contraseña - TASS SPD",
                "reset-password.html",
                {
                    name: user.first_name,
                    code
                }
            );
        } catch (e) { }

        return { ok: true, message: "Si el correo existe, se enviará un código" };
    }

    async resetPassword(email: string, code: string, newPass: string) {
        const user = await this.users.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.verification_code !== code) {
            throw new BadRequestException({ message: "Código inválido", code: ErrorCodes.INVALID_RESET_CODE });
        }

        user.password_hash = await hashPassword(newPass);
        user.verification_code = null;
        await this.users.save(user);

        return { ok: true, message: "Contraseña restablecida correctamente" };
    }
}
