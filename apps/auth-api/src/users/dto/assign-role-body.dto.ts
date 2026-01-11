import { IsUUID, IsNotEmpty } from "class-validator";

export class AssignRoleBodyDto {
    @IsUUID("4", { message: "El ID del rol debe ser un UUID válido" })
    @IsNotEmpty({ message: "El ID del rol es requerido" })
    roleId!: string;
}
