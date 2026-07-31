import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SendChatMessageDto {
  @ValidateIf((_object, value) => value !== null)
  @IsUUID('4')
  conversationId!: string | null;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{40,100}$/)
  confirmationToken!: string | null;
}
