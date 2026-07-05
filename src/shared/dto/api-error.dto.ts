import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ description: 'Status code of the error' })
  statusCode: number;
  @ApiProperty({ description: 'Name of the exception' })
  name: string;
  @ApiProperty({ description: 'Message of the error' })
  error: string;
  @ApiPropertyOptional({ description: 'Error code'})
  errorCode?: number;
}