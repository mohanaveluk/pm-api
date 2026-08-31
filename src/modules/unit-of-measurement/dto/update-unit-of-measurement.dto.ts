import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUnitOfMeasurementDto } from './create-unit-of-measurement.dto';

// code is immutable after creation — referenced by Material Master, PR, PO,
// Inventory, and ERP integrations as a stable machine-readable key.
export class UpdateUnitOfMeasurementDto extends PartialType(
  OmitType(CreateUnitOfMeasurementDto, [] as const),
) {}
