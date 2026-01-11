import { IsString, IsNotEmpty, IsUUID } from "class-validator";

export class CreatePermissionDto {
    @IsUUID("4", { message: "El ID del módulo debe ser un UUID válido" })
    @IsNotEmpty({ message: "El ID del módulo es requerido" })
    moduleId!: string;

    @IsUUID("4", { message: "El ID de la acción debe ser un UUID válido" })
    @IsNotEmpty({ message: "El ID de la acción es requerido" })
    actionId!: string;
}
