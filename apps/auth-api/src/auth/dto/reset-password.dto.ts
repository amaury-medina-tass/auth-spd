import { IsEmail, IsNotEmpty, IsString, Length, MinLength, IsEnum } from "class-validator";
import { SYSTEMS } from "@common/types/system";
import type { SystemType } from "@common/types/system";

export class ResetPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code!: string;

    @IsString()
    @MinLength(6)
    newPassword!: string;

    @IsEnum(SYSTEMS, { message: "Sistema inválido" })
    @IsNotEmpty()
    system!: SystemType;
}
