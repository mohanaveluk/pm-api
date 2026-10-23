import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { UserProjectMappingStatus } from '../enums/user-project-mapping.enums';
import { WorkflowEventResponseDto } from '../../workflow-tracking/dto/workflow-event-response.dto';

// ── Requests ─────────────────────────────────────────────────────────

export class CreateUserProjectMappingDto {
  @ApiProperty({ description: 'Project to assign', format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Internal users to assign the project to', type: [String] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true })
  userIds: string[];
}

/** The project's complete user list: missing users are added, users left out are removed. */
export class UpdateUserProjectMappingDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true })
  userIds: string[];
}

export class UpdateUserProjectMappingStatusDto {
  @ApiProperty({ enum: UserProjectMappingStatus })
  @IsEnum(UserProjectMappingStatus)
  status: UserProjectMappingStatus;
}

export const USER_PROJECT_MAPPING_SORT_FIELDS = [
  'projectCode', 'projectName', 'clientName', 'userCount', 'createdAt', 'updatedAt',
] as const;

export class UserProjectMappingQueryDto {
  @ApiPropertyOptional({ description: 'Project code or name, client, or a mapped user name / email' })
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Projects this user is mapped to' })
  @IsOptional() @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: UserProjectMappingStatus })
  @IsOptional() @IsEnum(UserProjectMappingStatus)
  status?: UserProjectMappingStatus;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: USER_PROJECT_MAPPING_SORT_FIELDS, default: 'projectCode' })
  @IsOptional() @IsIn(USER_PROJECT_MAPPING_SORT_FIELDS as unknown as string[])
  sortBy?: string = 'projectCode';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

// ── Responses ────────────────────────────────────────────────────────

export class MappedUserDto {
  @ApiProperty() mappingId: string;
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() position: string | null;
  @ApiProperty({ enum: UserProjectMappingStatus }) status: UserProjectMappingStatus;
  @ApiProperty({ description: 'False when the user account has since been deactivated' }) userActive: boolean;
  @ApiPropertyOptional() assignedBy: string | null;
  @ApiPropertyOptional() assignedAt: Date | null;
}

/** A project's mapping: the project, its client and every user assigned to it. */
export class UserProjectMappingResponseDto {
  @ApiProperty() projectId: string;
  @ApiProperty() projectCode: string;
  @ApiProperty() projectName: string;
  @ApiProperty() projectStatus: string;
  @ApiProperty() clientId: string;
  @ApiPropertyOptional() clientCode: string | null;
  @ApiPropertyOptional() clientName: string | null;
  @ApiProperty({ enum: UserProjectMappingStatus, description: 'ACTIVE when at least one user is active' })
  status: UserProjectMappingStatus;
  @ApiProperty() userCount: number;
  @ApiProperty() activeUserCount: number;
  @ApiProperty({ type: [MappedUserDto] }) users: MappedUserDto[];
  @ApiPropertyOptional() trackingId: string | null;
  @ApiPropertyOptional() createdBy: string | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() updatedBy: string | null;
  @ApiProperty() updatedAt: Date;
}

export class UserProjectMappingDetailDto extends UserProjectMappingResponseDto {
  @ApiProperty({ type: [WorkflowEventResponseDto], description: 'Assignment history, oldest first' })
  history: WorkflowEventResponseDto[];
}

export class UserProjectMappingListDto {
  @ApiProperty({ type: [UserProjectMappingResponseDto] }) items: UserProjectMappingResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

/** An internal user who can be given projects. */
export class EligibleUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() position: string | null;
  @ApiPropertyOptional() role: string | null;
}

/** A project the signed-in user can see, and why. */
export class MyProjectDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() projectName: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() clientName: string | null;
}
