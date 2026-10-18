import { Module } from '@nestjs/common';
import { WorkflowTrackingModule } from '../workflow-tracking/workflow-tracking.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { Discipline } from '../discipline/entity/discipline.entity';
import { Project } from '../project/entities/project.entity';
import { WbsCostCode } from './entity/wbs-cost-code.entity';
import { WbsCostCodeService } from './wbs-cost-code.service';
import { WbsCostCodeController } from './wbs-cost-code.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WbsCostCode, MasterCodeCounter, Discipline, Project]),
    // Edits are refused once a purchase order is raised against the WBS.
    WorkflowTrackingModule,
  ],
  providers:   [MasterCodeService, WbsCostCodeService],
  controllers: [WbsCostCodeController],
  exports:     [WbsCostCodeService, TypeOrmModule],
})
export class WbsCostCodeModule {}
