import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateModuleDto {
    @IsString({ message: "El nombre debe ser texto" })
    @IsNotEmpty({ message: "El nombre es requerido" })
    name!: string;

    @IsString({ message: "El path debe ser texto" })
    @IsNotEmpty({ message: "El path es requerido" })
    path!: string;

    @IsString({ message: "La descripción debe ser texto" })
    @IsOptional()
    description?: string;
}
