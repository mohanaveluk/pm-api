import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Material }            from './entities/material.entity';
import { MaterialCodeCounter } from './entities/material-code-counter.entity';
import { MaterialDocument }    from './entities/material-document.entity';
import { MaterialCategory }    from '../material-category/entities/material-category.entity';
import { MaterialGroup }       from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement }   from '../unit-of-measurement/entities/unit-of-measurement.entity';
import { MasterCodeCounter as SharedMasterCodeCounter } from 'src/common/entities/master-code-counter.entity';

import { MaterialController }            from './material.controller';
import { MaterialService }               from './material.service';
import { MaterialCodeService }           from './material-code.service';
import { MaterialImportService }         from './material-import.service';
import { MaterialUsageValidationService } from './material-usage-validation.service';
import { User } from '../user/entity/user.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { NotificationModule } from '../notification/notification.module';
import { WorkflowTrackingModule } from '../workflow-tracking/workflow-tracking.module';

@Module({
  imports: [
    // Every material action is a workflow_events step; each step notifies the users concerned.
    NotificationModule,
    WorkflowTrackingModule,
    TypeOrmModule.forFeature([
      Material,
      MaterialCodeCounter,
      MaterialDocument,
      MaterialCategory,
      MaterialGroup,
      UnitOfMeasurement,
      User,
      SharedMasterCodeCounter,
    ]),
  ],
  controllers: [MaterialController],
  providers:   [
    MaterialService, MaterialCodeService, MaterialImportService,
    MaterialUsageValidationService, CloudStorageService, MasterCodeService,
  ],
  exports:     [MaterialService, MaterialUsageValidationService],
})
export class MaterialModule {}
