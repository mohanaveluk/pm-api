import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { Discipline } from './entity/discipline.entity';
import { DisciplineService } from './discipline.service';
import { DisciplineController } from './discipline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline, MasterCodeCounter])],
  providers:   [MasterCodeService, DisciplineService],
  controllers: [DisciplineController],
  exports:     [DisciplineService, TypeOrmModule],
})
export class DisciplineModule {}
