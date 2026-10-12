import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

// Status moves only through the activate / deactivate endpoints so a
// deactivation always carries its reason. The code is server-generated and has
// no field here at all.
export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['status'] as const),
) {
  @ApiPropertyOptional({
    description:
      'The version the caller last read. When it no longer matches the stored version the ' +
      'update is rejected with 409 so a concurrent change is not silently overwritten.',
  })
  @IsOptional() @IsInt() @Min(1)
  version?: number;
}

export class DeactivateClientDto {
  @ApiPropertyOptional({ example: 'Contract concluded; no further work expected' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
