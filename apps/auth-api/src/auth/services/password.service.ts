import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserSpd } from "@common/entities/spd/user.entity";
import { UserSicgem } from "@common/entities/sicgem/user.entity";
import { hashPassword, verifyPassword } from "@common/security/password";
import { ErrorCodes } from "@common/errors/error-codes";
import { SystemType } from "@common/types/system";
import { BaseUser } from "@common/entities/base/base-user.entity";

@Injectable()
export class PasswordService {
    constructor(
        @InjectRepository(UserSpd) private readonly repoSpd: Repository<UserSpd>,
        @InjectRepository(UserSicgem) private readonly repoSicgem: Repository<UserSicgem>
    ) { }

    private getRepo(system: SystemType): Repository<BaseUser> {
        if (system === 'SPD') return this.repoSpd as unknown as Repository<BaseUser>;
        if (system === 'SICGEM') return this.repoSicgem as unknown as Repository<BaseUser>;
        throw new BadRequestException(`Sistema inválido: ${system}`);
    }

    async changePassword(userId: string, current: string, newPass: string, system: SystemType) {
        const repo = this.getRepo(system);
        const user = await repo.findOne({ where: { id: userId } });
        if (!user) throw new UnauthorizedException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        const ok = await verifyPassword(current, user.password_hash);
        if (!ok) throw new BadRequestException({ message: "Contraseña actual incorrecta", code: ErrorCodes.INVALID_PASSWORD });

        user.password_hash = await hashPassword(newPass);
        await repo.save(user);

        return { ok: true, message: "Contraseña actualizada correctamente" };
    }

    async forgotPassword(email: string, system: SystemType) {
        const repo = this.getRepo(system);
        const user = await repo.findOne({ where: { email } });

        // Security: Don't reveal if user exists
        if (!user) return { ok: true, message: "Si el correo existe, se enviará un código" };

        if (!user.email_verified) throw new BadRequestException({ message: "El correo no está verificado", code: ErrorCodes.EMAIL_NOT_VERIFIED_FOR_RESET });

        const code = randomInt(100000, 1000000).toString();
        user.verification_code = code;
        await repo.save(user);

        // Email sending is now handled by notification-service via domain events

        return { ok: true, message: "Si el correo existe, se enviará un código" };
    }

    async resetPassword(email: string, code: string, newPass: string, system: SystemType) {
        const repo = this.getRepo(system);
        const user = await repo.findOne({ where: { email } });
        if (!user) throw new BadRequestException({ message: "Usuario no encontrado", code: ErrorCodes.USER_NOT_FOUND });

        if (user.verification_code !== code) {
            throw new BadRequestException({ message: "Código inválido", code: ErrorCodes.INVALID_RESET_CODE });
        }

        user.password_hash = await hashPassword(newPass);
        user.verification_code = null;
        await repo.save(user);

        return { ok: true, message: "Contraseña restablecida correctamente" };
    }
}
