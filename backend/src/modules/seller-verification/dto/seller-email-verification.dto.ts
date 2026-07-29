import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SendSellerEmailCodeDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class VerifySellerEmailCodeDto extends SendSellerEmailCodeDto {
  @Transform(trim)
  @Matches(/^[0-9a-f-]{36}$/i)
  challengeId!: string;

  @Transform(trim)
  @Matches(/^\d{6}$/)
  code!: string;
}
