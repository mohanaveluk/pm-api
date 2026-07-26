import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';

// departmentId, disciplineId, departmentDisciplineId are immutable after creation
export class UpdateActivityDto extends PartialType(
  OmitType(CreateActivityDto, ['departmentDisciplineId', 'departmentId', 'disciplineId'] as const),
) {}
