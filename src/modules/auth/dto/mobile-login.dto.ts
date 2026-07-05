import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class MobileLoginDto {
  @ApiProperty({
    example: '+11234567890',
    description: 'US mobile number with country code',
  })
  @IsNotEmpty()
  @Matches(/^\+1[0-9]{10}$/, {
    message: 'Mobile number must be in format: +1XXXXXXXXXX (10 digits after country code)'
  })
  mobile: string;
}