import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';
import { ProjectStatus } from '../enums/project.enums';

// Status moves only through PATCH /projects/:id/status so a transition is
// validated and carries its reason. The code is server-generated and has no
// field at all.
export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['status'] as const),
) {}

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiPropertyOptional({ example: 'Awaiting client approval of the revised scope' })
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
