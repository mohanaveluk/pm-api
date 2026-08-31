import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { Department } from './entity/department.entity';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Department, MasterCodeCounter])],
  providers:   [MasterCodeService, DepartmentService],
  controllers: [DepartmentController],
  exports:     [DepartmentService, TypeOrmModule],
})
export class DepartmentModule {}
