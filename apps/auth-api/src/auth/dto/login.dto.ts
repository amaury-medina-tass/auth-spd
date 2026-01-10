import { IsEmail, IsIn, IsString } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "El correo electrónico no es válido" })
  email!: string;

  @IsString({ message: "La contraseña es requerida" })
  password!: string;

  @IsString({ message: "El sistema es requerido" })
  @IsIn(["DAGRD", "SICGEM"], { message: "Sistema inválido" })
  system!: string;
}