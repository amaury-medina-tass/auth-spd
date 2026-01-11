import { IsEmail, IsIn, IsString } from "class-validator";
import type { SystemType } from "@common/types/system";
import { SYSTEMS } from "@common/types/system";

export class LoginDto {
  @IsEmail({}, { message: "El correo electrónico no es válido" })
  email!: string;

  @IsString({ message: "La contraseña es requerida" })
  password!: string;

  @IsString({ message: "El sistema es requerido" })
  @IsIn(SYSTEMS, { message: "Sistema inválido" })
  system!: SystemType;
}
