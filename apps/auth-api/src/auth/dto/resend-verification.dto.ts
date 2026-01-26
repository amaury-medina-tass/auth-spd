import { IsEmail, IsNotEmpty, IsEnum } from "class-validator";
import { SystemType, SYSTEMS } from "@common/types/system";

export class ResendVerificationDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsEnum(SYSTEMS)
    system: SystemType;
}
