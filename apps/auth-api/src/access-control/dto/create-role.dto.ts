import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from "class-validator";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_default?: boolean;
}
