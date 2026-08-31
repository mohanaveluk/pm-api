import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Material }            from './entities/material.entity';
import { MaterialCodeCounter } from './entities/material-code-counter.entity';
import { MaterialDocument }    from './entities/material-document.entity';
import { MaterialCategory }    from '../material-category/entities/material-category.entity';
import { MaterialGroup }       from '../material-group/entities/material-group.entity';
import { UnitOfMeasurement }   from '../unit-of-measurement/entities/unit-of-measurement.entity';

import { MaterialController }            from './material.controller';
import { MaterialService }               from './material.service';
import { MaterialCodeService }           from './material-code.service';
import { MaterialUsageValidationService } from './material-usage-validation.service';
import { User } from '../user/entity/user.entity';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      MaterialCodeCounter,
      MaterialDocument,
      MaterialCategory,
      MaterialGroup,
      UnitOfMeasurement,
      User,
    ]),
  ],
  controllers: [MaterialController],
  providers:   [MaterialService, MaterialCodeService, MaterialUsageValidationService, CloudStorageService],
  exports:     [MaterialService, MaterialUsageValidationService],
})
export class MaterialModule {}
