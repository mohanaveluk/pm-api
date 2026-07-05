import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class ResendOTCDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to verify'
  })
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
}

export class ResendEmailDto {
  @ApiProperty({
    example: '1234-5678-9012-abcdef123456',
    description: 'User GUID'
  })
  @IsString({
    message: 'User GUID must be a string'
  })
  @Length(36, 36, {
    message: 'User GUID must be exactly 36 characters long'
  })
  userId: string;

}
