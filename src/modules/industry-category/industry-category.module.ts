import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustryCategory } from './entities/industry-category.entity';
import { IndustryCategoryService } from './industry-category.service';
import { IndustryCategoryController } from './industry-category.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([IndustryCategory])],
  providers:   [IndustryCategoryService],
  controllers: [IndustryCategoryController],
  exports:     [IndustryCategoryService, TypeOrmModule],
})
export class IndustryCategoryModule {}
