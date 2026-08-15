import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';

// code is server-generated and immutable; all other fields are patchable
export class UpdateMaterialDto extends PartialType(
  OmitType(CreateMaterialDto, [] as const),
) {}
