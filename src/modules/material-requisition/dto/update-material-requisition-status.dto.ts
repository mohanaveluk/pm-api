import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MaterialRequisitionStatus } from '../enums/material-requisition.enums';

export class UpdateMaterialRequisitionStatusDto {
  @ApiProperty({
    enum: MaterialRequisitionStatus,
    description: 'Target status. Allowed moves depend on the current status.',
    example: MaterialRequisitionStatus.ON_HOLD,
  })
  @IsEnum(MaterialRequisitionStatus)
  status: MaterialRequisitionStatus;
}
