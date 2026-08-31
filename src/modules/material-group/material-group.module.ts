import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { MaterialGroup } from './entities/material-group.entity';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { MaterialGroupService } from './material-group.service';
import { MaterialGroupController } from './material-group.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([MaterialGroup, MaterialCategory, MasterCodeCounter])],
  providers:   [MasterCodeService, MaterialGroupService],
  controllers: [MaterialGroupController],
  exports:     [MaterialGroupService, TypeOrmModule],
})
export class MaterialGroupModule {}
