import { PartialType } from '@nestjs/swagger';
import { CreateWbsCostCodeDto } from './create-wbs-cost-code.dto';

export class UpdateWbsCostCodeDto extends PartialType(CreateWbsCostCodeDto) {}
