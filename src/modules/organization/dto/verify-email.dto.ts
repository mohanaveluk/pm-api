import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyOrganizationEmailDto {
  @ApiProperty({ example: 'admin@acmecorp.com' })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty({example: 'guid'})
  @IsString()
  @IsOptional()
  oguid: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  otp: string;
}
