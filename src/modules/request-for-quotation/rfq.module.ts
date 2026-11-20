import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { EmailModule } from 'src/shared/email/email.module';
import { WorkflowTrackingModule } from '../workflow-tracking/workflow-tracking.module';
import { NotificationModule } from '../notification/notification.module';
import { UserProjectMappingModule } from '../user-project-mapping/user-project-mapping.module';
import { User } from '../user/entity/user.entity';
import { Project } from '../project/entities/project.entity';
import { Client } from '../client/entities/client.entity';
import { Vendor } from '../vendor/entities/vendor.entity';
import { VendorAddress } from '../vendor/entities/vendor-address.entity';
import { VendorDocument } from '../vendor/entities/vendor-document.entity';
import { MaterialRequisition } from '../material-requisition/entities/material-requisition.entity';
import { MaterialRequisitionItem } from '../material-requisition/entities/material-requisition-item.entity';
import { MaterialRequisitionDocument } from '../material-requisition/entities/material-requisition-document.entity';
import { MaterialRequisitionCompliance } from '../material-requisition/entities/material-requisition-compliance.entity';
import { MaterialRequisitionDeviation } from '../material-requisition/entities/material-requisition-deviation.entity';
import { Rfq } from './entities/rfq.entity';
import { RfqRequisition } from './entities/rfq-requisition.entity';
import { RfqItem } from './entities/rfq-item.entity';
import { RfqDocument } from './entities/rfq-document.entity';
import { RfqOtherCharge } from './entities/rfq-other-charge.entity';
import { RfqChecklistItem } from './entities/rfq-checklist-item.entity';
import { RfqCompliance } from './entities/rfq-compliance.entity';
import { RfqDeviation } from './entities/rfq-deviation.entity';
import { RfqAcknowledgement } from './entities/rfq-acknowledgement.entity';
import { RfqService } from './rfq.service';
import { RfqNotificationService } from './rfq-notification.service';
import { RfqPdfService } from './rfq-pdf.service';
import { RfqController } from './rfq.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rfq, RfqRequisition, RfqItem, RfqDocument, RfqOtherCharge, RfqChecklistItem, RfqCompliance, RfqDeviation, RfqAcknowledgement,
      MaterialRequisition, MaterialRequisitionItem, MaterialRequisitionDocument,
      MaterialRequisitionCompliance, MaterialRequisitionDeviation,
      Project, Client, Vendor, VendorAddress, VendorDocument, User, MasterCodeCounter,
    ]),
    // The RFQ email to the vendor.
    EmailModule,
    // RFQ steps join the requisition's workflow timeline (trackingId).
    WorkflowTrackingModule,
    NotificationModule,
    // Only projects the buyer can see.
    UserProjectMappingModule,
  ],
  providers: [MasterCodeService, CloudStorageService, RfqService, RfqNotificationService, RfqPdfService],
  controllers: [RfqController],
  exports: [RfqService],
})
export class RfqModule {}
