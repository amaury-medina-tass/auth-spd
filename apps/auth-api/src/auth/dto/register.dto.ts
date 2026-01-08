import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail({}, { message: "El correo electrónico no es válido" })
  email!: string;

  @IsString({ message: "El número de documento debe ser texto" })
  @MinLength(1, { message: "El número de documento es requerido" })
  documentNumber!: string;

  @IsString({ message: "El nombre debe ser texto" })
  @MinLength(1, { message: "El nombre es requerido" })
  firstName!: string;

  @IsString({ message: "El apellido debe ser texto" })
  @MinLength(1, { message: "El apellido es requerido" })
  lastName!: string;

  @IsString({ message: "La contraseña debe ser texto" })
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  password!: string;
}