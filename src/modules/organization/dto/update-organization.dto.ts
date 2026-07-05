import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, Length } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 255) organizationName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(7, 30) phoneNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 255) addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 20)  postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 50)  taxNumber?: string;
}
