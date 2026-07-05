import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PrimaryGeneratedColumn } from 'typeorm';
import { Alias } from 'typeorm/query-builder/Alias';

export class RegisterDto {

  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsEmail({}, {
    message: 'Please provide a valid email address'
  })
  @Matches(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    {
      message: 'Invalid email format. Example: user@example.com'
    }
  )
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (minimum 10 characters)',
  })
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Password must be at least 10 characters long'
  })
  password: string;

  @ApiProperty({
    example: '+11234567890',
    description: 'US mobile number with country code',
  })
  //@IsNotEmpty()
  // @Matches(/^\+1[0-9]{10}$/, {
  //   message: 'Mobile number must be in format: +1XXXXXXXXXX (10 digits after country code)'
  // })
  mobile: string;

  @ApiProperty({
    example: 'ABC Chennal',
    description: 'User organisation name',
  })
  @IsOptional()
  major: string;

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

  @ApiProperty({
    example: new Date(),
    description: 'User creation timestamp',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  created_at: Date = new Date();

  @ApiProperty({
    example: null,
    description: 'User last update timestamp',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updated_at?: Date;

  @ApiProperty({
    example: '7a7d386d-ba2d-4c72-923f-973821bc048d',
    description: 'User role guid',
    required: true,
    nullable: false,
    name: 'role_guid'
  })
  @IsOptional()
  role_guid: string;

  @ApiProperty({example: '3rpfoe78-ba2d-4c72-923f-97398pomnh360', description: 'OrgacnizationId', required: true, nullable: false, name: 'organization_id'})
  OrganizationId: string;
}