import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterCodeCounter } from 'src/common/entities/master-code-counter.entity';
import { MasterCodeService } from 'src/common/services/master-code.service';
import { CloudStorageService } from 'src/common/services/cloud-storage.service';
import { ClientType } from '../client-type/entity/client-type.entity';
import { IndustryCategory } from '../industry-category/entities/industry-category.entity';
import { ProjectType } from '../project-type/entity/project-type.entity';
import { Client } from './entities/client.entity';
import { ClientAddress } from './entities/client-address.entity';
import { ClientContact } from './entities/client-contact.entity';
import { ClientDocument } from './entities/client-document.entity';
import { ClientAuditLog } from './entities/client-audit-log.entity';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientAddress,
      ClientContact,
      ClientDocument,
      ClientAuditLog,
      ClientType,
      IndustryCategory,
      ProjectType,
      MasterCodeCounter,
    ]),
  ],
  providers:   [MasterCodeService, CloudStorageService, ClientService],
  controllers: [ClientController],
  exports:     [ClientService, TypeOrmModule],
})
export class ClientModule {}
