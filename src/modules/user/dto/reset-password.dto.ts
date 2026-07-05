import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123def456',
    description: 'Password reset token',
  })
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'New password (minimum 10 characters)',
  })
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Password must be at least 10 characters long'
  })
  password: string;
}