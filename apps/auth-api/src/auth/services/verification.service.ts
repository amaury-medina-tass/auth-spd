import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BaseUser } from "@common/entities/base/base-user.entity";
import { UserSpd } from "@common/entities/spd/user.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";

import { ErrorCodes } from "@common/errors/error-codes";
import { EmailService } from "@common/email/email.service";
import { SystemType } from "@common/types/system";

@Injectable()
export class VerificationService {
    constructor(
        @InjectRepository(UserSpd) private repoSpd: Repository<UserSpd>,
        @InjectRepository(UserSicgem) private repoSicgem: Repository<UserSicgem>,
        private emailService: EmailService
    ) { }

    private getRepo(system: SystemType): Repository<BaseUser> {
        if (system === 'SPD') return this.repoSpd as unknown as Repository<BaseUser>;
        if (system === 'SICGEM') return this.repoSicgem as unknown as Repository<BaseUser>;
        throw new BadRequestException("Sistema inválido");
    }

    async verifyEmail(email: string, code: string, system: SystemType) {
        const repo = this.getRepo(system);
        const user = await repo.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.email_verified) throw new BadRequestException({ message: "Email ya verificado", code: ErrorCodes.EMAIL_ALREADY_VERIFIED });

        if (user.verification_code !== code) {
            throw new BadRequestException({ message: "Código de verificación inválido", code: ErrorCodes.INVALID_VERIFICATION_CODE });
        }

        user.email_verified = true;
        user.verification_code = null;
        await repo.save(user);

        return { ok: true, message: "Email verificado correctamente" };
    }

    async resendVerificationCode(email: string, system: SystemType) {
        const repo = this.getRepo(system);
        const user = await repo.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.email_verified) throw new BadRequestException({ message: "Email ya verificado", code: ErrorCodes.EMAIL_ALREADY_VERIFIED });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verification_code = verificationCode;
        await repo.save(user);

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
        } catch (e) {
            throw new InternalServerErrorException("Error al enviar el correo de verificación");
        }

        return { ok: true, message: "Código reenviado correctamente" };
    }

    generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendVerificationEmail(user: BaseUser, code: string) {
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
