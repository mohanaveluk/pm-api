import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { MaterialCategory } from './entities/material-category.entity';
import { MaterialCategoryService } from './material-category.service';
import { MaterialCategoryController } from './material-category.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([MaterialCategory, MasterCodeCounter])],
  providers:   [MasterCodeService, MaterialCategoryService],
  controllers: [MaterialCategoryController],
  exports:     [MaterialCategoryService, TypeOrmModule],
})
export class MaterialCategoryModule {}
