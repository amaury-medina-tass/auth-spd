import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User } from "@common/entities/user.entity";
import { ErrorCodes } from "@common/errors/error-codes";
import { EmailService } from "@common/email/email.service";

@Injectable()
export class VerificationService {
    constructor(
        @InjectRepository(User) private users: Repository<User>,
        private emailService: EmailService
    ) { }

    async verifyEmail(email: string, code: string) {
        const user = await this.users.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.email_verified) throw new BadRequestException({ message: "Email ya verificado", code: ErrorCodes.EMAIL_ALREADY_VERIFIED });

        if (user.verification_code !== code) {
            throw new BadRequestException({ message: "Código de verificación inválido", code: ErrorCodes.INVALID_VERIFICATION_CODE });
        }

        user.email_verified = true;
        user.verification_code = null;
        await this.users.save(user);

        return { ok: true, message: "Email verificado correctamente" };
    }

    async resendVerificationCode(email: string) {
        const user = await this.users.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.email_verified) throw new BadRequestException({ message: "Email ya verificado", code: ErrorCodes.EMAIL_ALREADY_VERIFIED });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verification_code = verificationCode;
        await this.users.save(user);

        try {
            await this.emailService.sendTemplateEmail(
                user.email,
                "Nuevo código de verificación - TASS SPD",
                "verification.html",
                {
                    name: user.first_name,
                    code: verificationCode
                }
            );
        } catch (e) { }

        return { ok: true, message: "Código reenviado correctamente" };
    }

    generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendVerificationEmail(user: User, code: string) {
        try {
            await this.emailService.sendTemplateEmail(
                user.email,
                "Verifica tu cuenta - TASS SPD",
                "verification.html",
                {
                    name: user.first_name,
                    code
                }
            );
        } catch (e) { }
    }
}
