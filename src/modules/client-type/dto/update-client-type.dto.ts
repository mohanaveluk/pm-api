import { PartialType } from '@nestjs/swagger';
import { CreateClientTypeDto } from './create-client-type.dto';

export class UpdateClientTypeDto extends PartialType(CreateClientTypeDto) {}
