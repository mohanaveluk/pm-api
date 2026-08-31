import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { IndustryCategory } from './entities/industry-category.entity';
import { IndustryCategoryService } from './industry-category.service';
import { IndustryCategoryController } from './industry-category.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([IndustryCategory, MasterCodeCounter])],
  providers:   [MasterCodeService, IndustryCategoryService],
  controllers: [IndustryCategoryController],
  exports:     [IndustryCategoryService, TypeOrmModule],
})
export class IndustryCategoryModule {}
