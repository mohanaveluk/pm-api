import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaterialRequisitionDto } from './create-material-requisition.dto';

// A draft, a returned requisition, or one under review (by its creator or an
// assigned reviewer) can be updated. `submit` saves and (re)submits a draft or
// a returned requisition in one call; it is ignored while under review.
export class UpdateMaterialRequisitionDto extends PartialType(
  OmitType(CreateMaterialRequisitionDto, [] as const),
) {}
