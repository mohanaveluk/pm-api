import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MeasurementSystem } from '../../client/enums/client.enums';
import { ProjectStatus } from '../enums/project.enums';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

// Optional text fields accept `null` as well as a string: on update, null is how
// a caller clears a value that was previously set (undefined means "unchanged").

export class CreateProjectDto {
  // NOTE: `code` is absent by design — it is server-generated as a
  // per-organization sequence starting at 0001. Supplying it has no effect.
  //
  // NOTE: so is the client's name. The client is referenced by `clientId` and
  // its name is always read through that relationship.

  @ApiProperty({ example: 'Unit 4 Expansion — Process Plant' })
  @IsString() @IsNotEmpty() @Length(2, 255)
  projectName: string;

  @ApiProperty({ description: 'Client Master id — must be an active client of this organization' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Project Type master id' })
  @IsUUID()
  projectTypeId: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.PLANNED })
  @IsOptional() @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(4000)
  description?: string | null;

  @ApiProperty({ example: '2026-11-01', description: 'Planned start date (YYYY-MM-DD)' })
  @Matches(ISO_DATE, { message: 'startDate must be a YYYY-MM-DD date' })
  startDate: string;

  @ApiPropertyOptional({
    example: '2028-10-31',
    description: 'Planned completion date (YYYY-MM-DD); must be later than the start date',
    nullable: true,
  })
  @IsOptional() @Matches(ISO_DATE, { message: 'endDate must be a YYYY-MM-DD date' })
  endDate?: string | null;

  @ApiPropertyOptional({ description: 'Internal user who owns the project', nullable: true })
  @IsOptional() @IsUUID()
  projectManagerId?: string | null;

  @ApiPropertyOptional({ example: 'Jubail Industrial City — Plant 2', nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  siteLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(255)
  addressLine1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'SA', description: 'ISO 3166-1 alpha-2', nullable: true })
  @IsOptional() @Transform(upper) @IsISO31661Alpha2()
  countryCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  contractNumber?: string | null;

  @ApiPropertyOptional({ description: "The client's own project identifier", nullable: true })
  @IsOptional() @IsString() @MaxLength(100)
  clientProjectReference?: string | null;

  @ApiPropertyOptional({ example: 'USD', description: 'ISO 4217', nullable: true })
  @IsOptional() @Transform(upper) @Matches(/^[A-Z]{3}$/, { message: 'currencyCode must be a 3-letter ISO 4217 code' })
  currencyCode?: string | null;

  @ApiPropertyOptional({ enum: MeasurementSystem, nullable: true })
  @IsOptional() @IsEnum(MeasurementSystem)
  measurementSystem?: MeasurementSystem | null;

  @ApiPropertyOptional({ example: 'Asia/Riyadh', nullable: true })
  @IsOptional() @IsString() @MaxLength(64)
  timeZone?: string | null;
}
