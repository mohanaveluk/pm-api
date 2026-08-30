import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVendorDto } from './create-vendor.dto';

// Every field is patchable except the two that must not move through a plain
// update:
//
//   industryCategoryId — the vendor code prefix is derived from it. Changing
//     the category after the code is issued would leave CIV000042 sitting under
//     "Mechanical", so the link is fixed once the code exists.
//
// `code` never appears here because CreateVendorDto never declared it; the
// service rejects it defensively anyway in case a caller bypasses validation.
//
// vendorStatus is likewise absent: business status transitions go through the
// dedicated enable / disable / blacklist endpoints so each one can enforce its
// own rules and write its own audit trail.
export class UpdateVendorDto extends PartialType(
  OmitType(CreateVendorDto, ['industryCategoryId'] as const),
) {}
