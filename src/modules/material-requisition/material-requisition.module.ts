import { Module } from '@nestjs/common';
import { UserProjectMappingModule } from '../user-project-mapping/user-project-mapping.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { Material } from '../material/entities/material.entity';
import { Project } from '../project/entities/project.entity';
import { WbsCostCode } from '../wbs-cost-code/entity/wbs-cost-code.entity';
import { MaterialRequisition } from './entities/material-requisition.entity';
import { MaterialRequisitionItem } from './entities/material-requisition-item.entity';
import { MaterialRequisitionDocument } from './entities/material-requisition-document.entity';
import { MaterialRequisitionCompliance } from './entities/material-requisition-compliance.entity';
import { MaterialRequisitionDeviation } from './entities/material-requisition-deviation.entity';
import { MaterialRequisitionParticipant } from './entities/material-requisition-participant.entity';
import { User } from '../user/entity/user.entity';
import { EmailModule } from 'src/shared/email/email.module';
import { WorkflowTrackingModule } from '../workflow-tracking/workflow-tracking.module';
import { NotificationModule } from '../notification/notification.module';
import { MaterialRequisitionWorkflowService } from './material-requisition-workflow.service';
import { MaterialRequisitionNotificationService } from './material-requisition-notification.service';
import { MaterialRequisitionService } from './material-requisition.service';
import { MaterialRequisitionController } from './material-requisition.controller';

@Module({
  imports: [
    // Which projects a requester may raise requisitions on.
    UserProjectMappingModule,
    TypeOrmModule.forFeature([
      MaterialRequisition,
      MaterialRequisitionItem,
      MaterialRequisitionDocument,
      MaterialRequisitionCompliance,
      MaterialRequisitionDeviation,
      MaterialRequisitionParticipant,
      User,
      Material,
      Project,
      WbsCostCode,
      MasterCodeCounter,
    ]),
    // Review / approval emails.
    EmailModule,
    // trackingId + workflow timeline shared with RFQ, PO and later stages.
    WorkflowTrackingModule,
    // Says who is concerned by each requisition step (in-app notifications).
    NotificationModule,
  ],
  providers: [
    MasterCodeService, CloudStorageService, MaterialRequisitionService,
    MaterialRequisitionWorkflowService, MaterialRequisitionNotificationService,
  ],
  controllers: [MaterialRequisitionController],
  exports:     [MaterialRequisitionService, TypeOrmModule],
})
export class MaterialRequisitionModule {}
