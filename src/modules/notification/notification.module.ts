import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';
import { EmailHistory } from 'src/shared/email/entities/email-history.entity';
import { WorkflowEvent } from '../workflow-tracking/entities/workflow-event.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

/**
 * In-app notifications. Imported by the modules that create them (email,
 * workflow tracking, vendor, material requisition); it imports none of them,
 * so there is no module cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, EmailHistory, WorkflowEvent])],
  providers:   [NotificationService],
  controllers: [NotificationController],
  exports:     [NotificationService],
})
export class NotificationModule {}
