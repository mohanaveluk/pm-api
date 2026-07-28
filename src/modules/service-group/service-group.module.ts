import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceGroup } from './entities/service-group.entity';
import { ServiceGroupActivity } from './entities/service-group-activity.entity';
import { ServiceGroupPermission } from './entities/service-group-permission.entity';
import { Activity } from '../activity/entities/activity.entity';
import { ServiceGroupService } from './service-group.service';
import { ServiceGroupController } from './service-group.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceGroup,
      ServiceGroupActivity,
      ServiceGroupPermission,
      Activity,
    ]),
  ],
  providers:   [ServiceGroupService],
  controllers: [ServiceGroupController],
  exports:     [ServiceGroupService, TypeOrmModule],
})
export class ServiceGroupModule {}
