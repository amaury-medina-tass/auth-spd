import { IsEmail, IsNotEmpty, IsEnum } from "class-validator";
import { SYSTEMS } from "@common/types/system";
import type { SystemType } from "@common/types/system";

export class ForgotPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsEnum(SYSTEMS, { message: "Sistema inválido" })
    @IsNotEmpty()
    system!: SystemType;
}
