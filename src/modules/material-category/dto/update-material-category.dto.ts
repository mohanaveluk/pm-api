import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaterialCategoryDto } from './create-material-category.dto';

// code is immutable after creation — omit it from the update shape entirely.
// isSystem is also omitted: it must not be toggled via a regular update endpoint.
export class UpdateMaterialCategoryDto extends PartialType(
  OmitType(CreateMaterialCategoryDto, ['isSystem'] as const),
) {}
