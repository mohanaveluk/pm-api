import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateIndustryCategoryDto } from './create-industry-category.dto';

// code is immutable after creation — omit it from the update shape entirely.
// isSystem is also omitted: it must not be toggled via a regular update endpoint.
export class UpdateIndustryCategoryDto extends PartialType(
  OmitType(CreateIndustryCategoryDto, ['code', 'isSystem'] as const),
) {}
