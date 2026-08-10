import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaterialGroupDto } from './create-material-group.dto';

// code and materialCategoryId are immutable after creation.
// isSystem cannot be toggled through the regular update endpoint.
export class UpdateMaterialGroupDto extends PartialType(
  OmitType(CreateMaterialGroupDto, ['code', 'materialCategoryId', 'isSystem'] as const),
) {}
