import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialRequisition } from '../material-requisition/entities/material-requisition.entity';
import { WorkflowEvent } from './entities/workflow-event.entity';
import { NotificationModule } from '../notification/notification.module';
import { WorkflowTrackingService } from './workflow-tracking.service';
import { WorkflowLockService } from './workflow-lock.service';
import { WorkflowTrackingController } from './workflow-tracking.controller';

/**
 * Cross-document workflow tracking: the trackingId, the timeline of every step,
 * and the post-purchase-order lock. Imported by each module that takes part in
 * the procurement cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEvent, MaterialRequisition]), NotificationModule],
  providers:   [WorkflowTrackingService, WorkflowLockService],
  controllers: [WorkflowTrackingController],
  exports:     [WorkflowTrackingService, WorkflowLockService],
})
export class WorkflowTrackingModule {}
