import { IsEmail, IsNotEmpty, IsString, Length, IsEnum } from "class-validator";
import { SystemType, SYSTEMS } from "@common/types/system";

export class VerifyEmailDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;

    @IsEnum(SYSTEMS)
    system: SystemType;
}
