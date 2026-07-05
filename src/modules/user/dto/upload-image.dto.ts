import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile image file (jpg, jpeg, png)',
  })
  @IsNotEmpty()
  file: Express.Multer.File;
}