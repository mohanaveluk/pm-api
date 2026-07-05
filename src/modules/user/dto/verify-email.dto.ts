import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
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
  email?: string;

  @ApiProperty({
    example: '123456',
    description: 'user guid code'
  })
  @IsString({
    message: 'User guid must be a string'
  })
  @Length(36, 36, {
    message: 'User guid must be min 36 characters long'
  })
  uguid: string;

  @ApiProperty({
    example: '123456',
    description: 'Six-digit verification code'
  })
  @IsString()
  @Length(6, 6)
  code: string;
}