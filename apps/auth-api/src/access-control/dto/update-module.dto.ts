import { IsString, IsOptional } from "class-validator";

export class UpdateModuleDto {
    @IsString({ message: "El nombre debe ser texto" })
    @IsOptional()
    name?: string;

    @IsString({ message: "La descripción debe ser texto" })
    @IsOptional()
    description?: string;

    @IsString({ message: "La ruta debe ser texto" })
    @IsOptional()
    path?: string;
}
