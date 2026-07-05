// src/modules/country/dto/country.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

// ─────────────────────────────────────────────────────────
//  Response DTO  — shape returned to the client
// ─────────────────────────────────────────────────────────
export class CountryResponseDto {
  @ApiProperty({
    description: 'Unique UUID of the country',
    example: 'c81fe682-33a0-11f1-abe6-00155d1e4039',
  })
  id: string;

  @ApiProperty({
    description: 'Full country name',
    example: 'India',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 or alpha-3 country code',
    example: 'IN',
    nullable: true,
  })
  isoCode: string | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2026-04-09T00:12:40.000Z',
  })
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────
//  List response envelope
// ─────────────────────────────────────────────────────────
export class CountryListResponseDto {
  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ example: 'Retrieved 12 countries' })
  message: string;

  @ApiProperty({ type: [CountryResponseDto] })
  data: CountryResponseDto[];

  @ApiProperty({ example: '2026-04-09T04:35:25.097Z' })
  timestamp: string;
}

// ─────────────────────────────────────────────────────────
//  Single response envelope
// ─────────────────────────────────────────────────────────
export class CountrySingleResponseDto {
  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ example: 'Country found' })
  message: string;

  @ApiProperty({ type: CountryResponseDto })
  data: CountryResponseDto;

  @ApiProperty({ example: '2026-04-09T04:35:25.097Z' })
  timestamp: string;
}

// ─────────────────────────────────────────────────────────
//  Query param DTO  — GET /countries?isoCode=IN
// ─────────────────────────────────────────────────────────
export class CountryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by ISO code (case-insensitive)',
    example: 'IN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  isoCode?: string;
}