import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Contact } from './entity/contact.entity';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from 'src/shared/email/email.module';
import { LogModule } from '../logger/log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact]),
    EmailModule,
    LogModule
  ],
  controllers: [ContactController],
  providers: [ContactService]
})
export class ContactModule {}