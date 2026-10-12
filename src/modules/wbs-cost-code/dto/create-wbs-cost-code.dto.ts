import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

// Optional text fields accept `null` as well as a string: on update, null is how
// a caller clears a value that was previously set (undefined means "unchanged").
export class CreateWbsCostCodeDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.

  @ApiProperty({
    example: 'Unit 100 — Process Plant Civil Works',
    description: 'WBS / Cost name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  projectDetails: string;

  @ApiProperty({
    description:
      'Project this WBS / cost code belongs to — an open (planned, active or on hold) project ' +
      'of this organization. Its client is read from the project, never sent.',
  })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: 'Process Area 1', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  areaFacility?: string | null;

  @ApiPropertyOptional({ example: 'Cooling Water System', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  systemSubsystem?: string | null;

  @ApiPropertyOptional({
    description: 'Discipline UUID — one of the organization\'s active disciplines (GET /disciplines/active)',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  disciplineId?: string | null;

  @ApiPropertyOptional({ example: 'WP-110 Foundations', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  workPackage?: string | null;

  @ApiPropertyOptional({
    example: 'Excavation, blinding, rebar, formwork, concrete pour',
    description: 'Activities (schedule level)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  activities?: string | null;

  @ApiPropertyOptional({ example: true, description: 'Whether the WBS / cost code is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
