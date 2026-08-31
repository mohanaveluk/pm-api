import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { VendorType } from './entity/vendor-type.entity';
import { VendorTypeService } from './vendor-type.service';
import { VendorTypeController } from './vendor-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VendorType, MasterCodeCounter])],
  providers:   [MasterCodeService, VendorTypeService],
  controllers: [VendorTypeController],
  exports:     [VendorTypeService, TypeOrmModule],
})
export class VendorTypeModule {}
