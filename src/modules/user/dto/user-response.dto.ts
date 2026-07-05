import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  uguid: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  first_name?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  last_name?: string;

  @ApiProperty({
    description: 'email of the user',
    example: 'exexample@site.com'
  })
  email: string;

  @ApiProperty({
    example: '+11234567890',
    description: 'US mobile number with country code',
  })
  mobile?: string;

  @ApiProperty({
    example: 'Computer Science',
    description: 'User major/field of study',
  })
  major?: string;

  @ApiProperty({
    example: 'image url',
    description: 'user profile image link/url',
  })
  profileImage?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-09-20T12:00:00Z'
  })
  created_at: Date;
}