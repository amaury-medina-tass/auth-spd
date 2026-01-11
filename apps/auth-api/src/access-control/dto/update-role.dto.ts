import { IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";

export class UpdateRoleDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsBoolean()
    @IsOptional()
    is_default?: boolean;
}
