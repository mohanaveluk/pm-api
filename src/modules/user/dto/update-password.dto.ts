import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordOldDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'Current password',
  })
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}