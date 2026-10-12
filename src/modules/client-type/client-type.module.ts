import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { ClientType } from './entity/client-type.entity';
import { ClientTypeService } from './client-type.service';
import { ClientTypeController } from './client-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClientType, MasterCodeCounter])],
  providers:   [MasterCodeService, ClientTypeService],
  controllers: [ClientTypeController],
  exports:     [ClientTypeService, TypeOrmModule],
})
export class ClientTypeModule {}
