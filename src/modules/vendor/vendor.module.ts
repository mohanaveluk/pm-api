import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Vendor }              from './entities/vendor.entity';
import { VendorCodeCounter }   from './entities/vendor-code-counter.entity';
import { VendorContact }       from './entities/vendor-contact.entity';
import { VendorAddress }       from './entities/vendor-address.entity';
import { VendorBankAccount }   from './entities/vendor-bank-account.entity';
import { VendorCertification } from './entities/vendor-certification.entity';
import { VendorDocument }      from './entities/vendor-document.entity';
import { VendorMaterial }      from './entities/vendor-material.entity';
import { VendorTurnover }      from './entities/vendor-turnover.entity';
import { VendorEvaluation }    from './entities/vendor-evaluation.entity';
import { VendorPerformance }   from './entities/vendor-performance.entity';
import { VendorStatusChangeRequest } from './entities/vendor-status-change-request.entity';

import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { Material }         from '../material/entities/material.entity';
import { User }             from '../user/entity/user.entity';

import { VendorController }             from './vendor.controller';
import { VendorService }                from './vendor.service';
import { VendorCodeService }            from './vendor-code.service';
import { VendorUsageValidationService } from './vendor-usage-validation.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { EmailModule } from 'src/shared/email/email.module';
import { MaterialCategory } from '../material-category/entities/material-category.entity';

@Module({
  imports: [
    // EmailModule supplies EmailService for the blacklist approval notifications.
    EmailModule,
    TypeOrmModule.forFeature([
      Vendor,
      VendorCodeCounter,
      VendorContact,
      VendorAddress,
      VendorBankAccount,
      VendorCertification,
      VendorDocument,
      VendorMaterial,
      VendorTurnover,
      VendorEvaluation,
      VendorPerformance,
      VendorStatusChangeRequest,
      IndustryCategory,
      MaterialCategory,
      Material,
      User,
    ]),
  ],
  controllers: [VendorController],
  providers:   [VendorService, VendorCodeService, VendorUsageValidationService, CloudStorageService],
  // VendorUsageValidationService is exported so downstream procurement modules
  // (RFQ, PO, Contract) can register their own dependency checks against it.
  exports:     [VendorService, VendorUsageValidationService, TypeOrmModule],
})
export class VendorModule {}
