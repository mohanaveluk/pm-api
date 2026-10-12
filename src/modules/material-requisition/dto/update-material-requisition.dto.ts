import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMaterialRequisitionDto } from './create-material-requisition.dto';

// Only a draft can be updated. `submit` is allowed so a draft can be saved and
// submitted in one call.
export class UpdateMaterialRequisitionDto extends PartialType(
  OmitType(CreateMaterialRequisitionDto, [] as const),
) {}
