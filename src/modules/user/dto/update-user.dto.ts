import { IsString, IsEmail, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
        description: 'US mobile number with country code',
    })
    @IsOptional()
    @Matches(/^\+1[0-9]{10}$/, {
        message: 'Mobile number must be in format: +1XXXXXXXXXX (10 digits after country code)'
    })
    mobile?: string;

    @ApiProperty({ enum: ['admin', 'manager', 'user'], required: false })
    @IsOptional()
    //@IsEnum(['admin', 'manager', 'user'])
    roleGuid?: string;
}