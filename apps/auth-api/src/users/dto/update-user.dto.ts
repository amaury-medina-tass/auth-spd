import { IsEmail, IsOptional, IsString, IsBoolean, MaxLength } from "class-validator";

export class UpdateUserDto {
    @IsOptional()
    @IsEmail({}, { message: "El email debe ser válido" })
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    document_number?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    first_name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    last_name?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
