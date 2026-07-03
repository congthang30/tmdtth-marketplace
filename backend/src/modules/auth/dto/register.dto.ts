import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(2, 150)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+()\-\s]{8,20}$/)
  phoneNumber?: string;
}
