import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateActionDto {
    @IsString({ message: "El código de la acción debe ser texto" })
    @IsNotEmpty({ message: "El código de la acción es requerido" })
    code_action!: string;

    @IsString({ message: "El nombre debe ser texto" })
    @IsNotEmpty({ message: "El nombre es requerido" })
    name!: string;

    @IsString({ message: "La descripción debe ser texto" })
    @IsOptional()
    description?: string;
}

