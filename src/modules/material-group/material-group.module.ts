import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialGroup } from './entities/material-group.entity';
import { MaterialCategory } from '../material-category/entities/material-category.entity';
import { MaterialGroupService } from './material-group.service';
import { MaterialGroupController } from './material-group.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([MaterialGroup, MaterialCategory])],
  providers:   [MaterialGroupService],
  controllers: [MaterialGroupController],
  exports:     [MaterialGroupService, TypeOrmModule],
})
export class MaterialGroupModule {}
