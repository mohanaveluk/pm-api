import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitOfMeasurement } from './entities/unit-of-measurement.entity';
import { UnitOfMeasurementService } from './unit-of-measurement.service';
import { UnitOfMeasurementController } from './unit-of-measurement.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([UnitOfMeasurement])],
  providers:   [UnitOfMeasurementService],
  controllers: [UnitOfMeasurementController],
  exports:     [UnitOfMeasurementService, TypeOrmModule],
})
export class UnitOfMeasurementModule {}
