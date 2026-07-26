import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDepartmentDisciplineDto } from './create-department-discipline.dto';

// departmentId and disciplineId are immutable after creation
export class UpdateDepartmentDisciplineDto extends PartialType(
  OmitType(CreateDepartmentDisciplineDto, ['departmentId', 'disciplineId'] as const),
) {}
