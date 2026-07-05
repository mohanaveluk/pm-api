import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length, Matches } from 'class-validator';

export class ValidateOTCDto {
  @ApiProperty({
    example: '+11234567890',
    description: 'US mobile number with country code',
  })
  @IsNotEmpty()
  // @Matches(/^\+1[0-9]{10}$/, {
  //   message: 'Mobile number must be in format: +1XXXXXXXXXX (10 digits after country code)'
  // })
  mobile: string;

  @ApiProperty({
    example: '123456',
    description: 'Six-digit OTC code',
  })
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}