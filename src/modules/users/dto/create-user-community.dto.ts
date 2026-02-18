import { IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';

/**
 * DTO para el registro de nuevos usuarios COMMUNITY a través del portal
 * Estos usuarios se crean sin verificación de email previa
 */
export class CreateUserCommunityDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString()
  lastName: string;

  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  password: string;
}
