// src/modules/country/country.controller.ts

import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CountryService } from './country.service';
import {
  CountryListResponseDto,
  CountrySingleResponseDto,
  CountryQueryDto,
} from './dto/country.dto';

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  // ── GET /countries ────────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all countries',
    description:
      'Returns a complete list of all countries sorted alphabetically by name. ' +
      'Optionally filter by ISO code using the `isoCode` query parameter.',
  })
  @ApiQuery({
    name:        'isoCode',
    required:    false,
    description: 'Filter by ISO code (case-insensitive). e.g. IN, US, GB',
    example:     'IN',
  })
  @ApiResponse({
    status:      200,
    description: 'Countries retrieved successfully',
    type:        CountryListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(
    @Query() query: CountryQueryDto,
  ): Promise<CountryListResponseDto> {
    // If isoCode query param provided, delegate to the ISO lookup
    // and wrap the single result in a list envelope for consistency
    if (query.isoCode) {
      const single = await this.countryService.findByIsoCode(query.isoCode);
      return {
        status:    single.status,
        message:   `Retrieved 1 country`,
        data:      [single.data],
        timestamp: single.timestamp,
      };
    }
    return this.countryService.findAll();
  }

  // ── GET /countries/:id ────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Get a country by ID or ISO code',
    description:
      'Look up a single country. Pass a full UUID to find by ID, ' +
      'or pass a 2–5 character ISO code (e.g. `IN`, `US`, `GBR`) to find by code. ' +
      'The endpoint automatically detects which format was supplied.',
  })
  @ApiParam({
    name:        'id',
    description: 'Country UUID  or  ISO code (2–5 chars, case-insensitive)',
    examples: {
      uuid: {
        summary: 'By UUID',
        value:   'c81fe682-33a0-11f1-abe6-00155d1e4039',
      },
      iso: {
        summary: 'By ISO code',
        value:   'IN',
      },
    },
  })
  @ApiResponse({
    status:      200,
    description: 'Country found',
    type:        CountrySingleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid identifier format' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<CountrySingleResponseDto> {
    // ── Detect format ──────────────────────────────────────────────────────
    // UUID pattern:  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // ISO code: 2–5 alphabetic characters only
    const ISO_REGEX = /^[a-zA-Z]{2,5}$/;

    if (UUID_REGEX.test(id)) {
      return this.countryService.findById(id);
    }

    if (ISO_REGEX.test(id)) {
      return this.countryService.findByIsoCode(id);
    }

    throw new BadRequestException(
      `"${id}" is not a valid UUID or ISO country code. ` +
      `Provide a UUID (e.g. c81fe682-33a0-11f1-abe6-00155d1e4039) ` +
      `or an ISO code (e.g. IN, US, GBR).`,
    );
  }
}