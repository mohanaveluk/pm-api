import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches,
} from 'class-validator';

export class RegisterOrganizationDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  organizationName: string;

  @ApiProperty({ example: 'admin@acmecorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  @Length(7, 30)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://acmecorp.com' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  website?: string;

  @ApiPropertyOptional({ example: 'Acme Corporation LLC' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  legalName?: string;
}
