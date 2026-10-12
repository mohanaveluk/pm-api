import { Module } from '@nestjs/common';
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
import { MaterialRequisitionService } from './material-requisition.service';
import { MaterialRequisitionController } from './material-requisition.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialRequisition,
      MaterialRequisitionItem,
      MaterialRequisitionDocument,
      Material,
      Project,
      WbsCostCode,
      MasterCodeCounter,
    ]),
  ],
  providers:   [MasterCodeService, CloudStorageService, MaterialRequisitionService],
  controllers: [MaterialRequisitionController],
  exports:     [MaterialRequisitionService, TypeOrmModule],
})
export class MaterialRequisitionModule {}
