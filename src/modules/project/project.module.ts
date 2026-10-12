import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { Client } from '../client/entities/client.entity';
import { ClientContact } from '../client/entities/client-contact.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';
import { User } from '../user/entity/user.entity';
import { Project } from './entities/project.entity';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project, Client, ClientContact, ProjectType, User, MasterCodeCounter,
    ]),
  ],
  providers:   [MasterCodeService, ProjectService],
  controllers: [ProjectController],
  exports:     [ProjectService, TypeOrmModule],
})
export class ProjectModule {}
