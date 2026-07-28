import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceGroupUser } from './entities/service-group-user.entity';
import { ServiceGroup } from '../service-group/entities/service-group.entity';
import { ServiceGroupActivity } from '../service-group/entities/service-group-activity.entity';
import { User } from '../user/entity/user.entity';
import { ServiceGroupUserService } from './service-group-user.service';
import { ServiceGroupUserController } from './service-group-user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceGroupUser,
      ServiceGroup,
      ServiceGroupActivity,
      User,
    ]),
  ],
  providers:   [ServiceGroupUserService],
  controllers: [ServiceGroupUserController],
  exports:     [ServiceGroupUserService, TypeOrmModule],
})
export class ServiceGroupUserModule {}
