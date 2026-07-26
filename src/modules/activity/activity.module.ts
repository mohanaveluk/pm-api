import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { Department } from '../department/entity/department.entity';
import { Discipline } from '../discipline/entity/discipline.entity';
import { DepartmentDiscipline } from '../department-discipline/entities/department-discipline.entity';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, Department, Discipline, DepartmentDiscipline]),
  ],
  providers:   [ActivityService],
  controllers: [ActivityController],
  exports:     [ActivityService, TypeOrmModule],
})
export class ActivityModule {}
