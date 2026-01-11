import { IsString, IsOptional } from "class-validator";

export class UpdateActionDto {
    @IsString({ message: "El nombre debe ser texto" })
    @IsOptional()
    name?: string;

    @IsString({ message: "La descripción debe ser texto" })
    @IsOptional()
    description?: string;
}

