import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { UnitOfMeasurement } from './entities/unit-of-measurement.entity';
import { UnitOfMeasurementService } from './unit-of-measurement.service';
import { UnitOfMeasurementController } from './unit-of-measurement.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([UnitOfMeasurement, MasterCodeCounter])],
  providers:   [MasterCodeService, UnitOfMeasurementService],
  controllers: [UnitOfMeasurementController],
  exports:     [UnitOfMeasurementService, TypeOrmModule],
})
export class UnitOfMeasurementModule {}
