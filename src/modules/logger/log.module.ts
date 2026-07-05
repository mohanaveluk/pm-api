import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entity/log.entity';
import { CustomLoggerService } from './custom-logger.service';


@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class LogModule {}