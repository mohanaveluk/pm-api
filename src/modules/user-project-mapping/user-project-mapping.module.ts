import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../project/entities/project.entity';
import { User } from '../user/entity/user.entity';
import { WorkflowTrackingModule } from '../workflow-tracking/workflow-tracking.module';
import { UserProjectMapping } from './entities/user-project-mapping.entity';
import { UserProjectMappingService } from './user-project-mapping.service';
import { UserProjectAccessService } from './user-project-access.service';
import { UserProjectMappingController } from './user-project-mapping.controller';

/**
 * Project ↔ internal user assignments. Exports UserProjectAccessService, which
 * the project and requisition modules use to limit the projects a user sees.
 */
@Module({
  imports: [
    // Every assignment change is a workflow step that notifies the users concerned.
    WorkflowTrackingModule,
    TypeOrmModule.forFeature([UserProjectMapping, Project, User]),
  ],
  providers:   [UserProjectMappingService, UserProjectAccessService],
  controllers: [UserProjectMappingController],
  exports:     [UserProjectAccessService],
})
export class UserProjectMappingModule {}
