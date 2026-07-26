import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentDiscipline } from './entities/department-discipline.entity';
import { Department } from '../department/entity/department.entity';
import { Discipline } from '../discipline/entity/discipline.entity';
import { DepartmentDisciplineService } from './department-discipline.service';
import { DepartmentDisciplineController } from './department-discipline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentDiscipline, Department, Discipline])],
  providers:   [DepartmentDisciplineService],
  controllers: [DepartmentDisciplineController],
  exports:     [DepartmentDisciplineService, TypeOrmModule],
})
export class DepartmentDisciplineModule {}
