import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'admin@acmecorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
