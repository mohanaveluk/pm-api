import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialCategory } from './entities/material-category.entity';
import { MaterialCategoryService } from './material-category.service';
import { MaterialCategoryController } from './material-category.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([MaterialCategory])],
  providers:   [MaterialCategoryService],
  controllers: [MaterialCategoryController],
  exports:     [MaterialCategoryService, TypeOrmModule],
})
export class MaterialCategoryModule {}
