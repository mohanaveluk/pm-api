import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsPostalCode, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsOptional()
  @MinLength(2)
  first_name?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsOptional()
  @MinLength(2)
  last_name?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+11234567890',
    description: 'US mobile number with country code',
  })
  @IsOptional()
  // @Matches(/^\+[1-9]\d{7,14}$/, {
  //   message: 'Mobile number must be in format: +1XXXXXXXXXX (10 digits after country code)'
  // })
  @IsPhoneNumber(null, {
    message: 'Mobile number must be a valid international phone number'
  })
  mobile?: string;

  @ApiPropertyOptional({
    example: 'ABC Channel',
    description: 'User Media Name',
  })
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty({
    example: '******',
    description: 'User password',
  })
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiProperty({
    example: 'image url',
    description: 'user profile image link/url',
  })
  @IsOptional()
  profileImage?: string;

  // -------- Address Fields --------

  @ApiProperty({
    example: '123 Main Street',
    description: 'Address line 1',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  address_line1?: string;

  @ApiProperty({
    example: 'Apt 4B',
    description: 'Address line 2',
  })
  @IsOptional()
  @IsString()
  address_line2?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @ApiProperty({
    example: 'NY',
    description: 'State or province',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  state?: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal / ZIP code',
  })
  @IsOptional()
  @IsPostalCode('any')
  postal_code?: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country name',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  country?: string;

  // -------- Professional Fields --------

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth',
  })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({
    example: 'Senior Software Engineer',
    description: 'Job position',
  })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    example: 'New York, NY',
    description: 'Work location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: 'manager@company.com',
    description: 'Reports to (manager email or ID)',
  })
  @IsOptional()
  @IsString()
  report_to?: string;

  @ApiProperty({
    example: 'Jane Smith, John Doe',
    description: 'Team members or colleagues working with',
  })
  @IsOptional()
  @IsString()
  worksWith?: string;

  @ApiProperty({
    example: 'Project Alpha',
    description: 'Current project name',
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({
    example: 'Project Alpha, Project Beta, Project Gamma',
    description: 'List of projects worked on',
  })
  @IsOptional()
  @IsString()
  projectsWorkedOn?: string;
}