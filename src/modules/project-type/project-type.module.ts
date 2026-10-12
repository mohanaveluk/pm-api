import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { ProjectType } from './entity/project-type.entity';
import { ProjectTypeService } from './project-type.service';
import { ProjectTypeController } from './project-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectType, MasterCodeCounter])],
  providers:   [MasterCodeService, ProjectTypeService],
  controllers: [ProjectTypeController],
  exports:     [ProjectTypeService, TypeOrmModule],
})
export class ProjectTypeModule {}
