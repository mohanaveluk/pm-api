import { IsString, IsEmail, IsOptional, IsBoolean, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Every field is optional — this is a partial update, and an admin editing a
// user rarely touches all of them at once. Deliberately has no `password`
// field: resetting a password goes through the dedicated forgot-password /
// update-password flow so it stays hashed and audited there, not silently
// overwritten as plain text through a generic "edit user" form.
export class UpdateUserDto {
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

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({
        example: '+11234567890',
        description: 'Mobile number with country code',
    })
    @IsOptional()
    @Matches(/^\+?[\d\s\-()]{7,20}$/, {
        message: 'Enter a valid mobile number',
    })
    mobile?: string;

    @ApiPropertyOptional({ example: '1990-01-15', description: 'Date of birth' })
    @IsOptional()
    @IsString()
    dob?: string;

    @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Job position' })
    @IsOptional()
    @IsString()
    position?: string;

    @ApiPropertyOptional({ example: 'New York, NY', description: 'Work location' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ example: 'Jane Smith', description: 'Reports to (manager name)' })
    @IsOptional()
    @IsString()
    report_to?: string;

    @ApiPropertyOptional({ example: 'Jane Smith, John Doe', description: 'Team members working with' })
    @IsOptional()
    @IsString()
    worksWith?: string;

    @ApiPropertyOptional({ example: 'Project Alpha, Project Beta', description: 'Projects worked on' })
    @IsOptional()
    @IsString()
    projectsWorkedOn?: string;

    @ApiProperty({
        example: '7a7d386d-ba2d-4c72-923f-973821bc048d',
        description: 'Role guid — the role this user is reassigned to',
        required: false,
    })
    @IsOptional()
    @IsString()
    role_guid?: string;

    @ApiPropertyOptional({
        example: true,
        description:
            'True for internal staff, false for an external (vendor-side) account — that ' +
            'user will only ever see the Vendor Master records they themselves created.',
    })
    @IsOptional()
    @IsBoolean()
    is_internal?: boolean;
}
