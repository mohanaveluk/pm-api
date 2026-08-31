import { PartialType } from '@nestjs/swagger';
import { CreateVendorTypeDto } from './create-vendor-type.dto';

export class UpdateVendorTypeDto extends PartialType(CreateVendorTypeDto) {}
