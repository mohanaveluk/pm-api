// src/modules/country/country.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CountryResponseDto,
  CountryListResponseDto,
  CountrySingleResponseDto,
} from './dto/country.dto';
import { Country } from './entity/country.entity';


@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  // ── Mapper: entity → DTO ────────────────────────────────────────────────
  private toDto(country: Country): CountryResponseDto {
    return {
      id:        country.id,
      name:      country.name,
      isoCode:   country.isoCode ?? null,
      createdAt: country.createdAt,
    };
  }

  // ── GET all countries (sorted A-Z) ──────────────────────────────────────
  async findAll(): Promise<CountryListResponseDto> {
    const countries = await this.countryRepo.find({
      order: { name: 'ASC' },
    });

    return {
      status:    true,
      message:   `Retrieved ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}`,
      data:      countries.map(this.toDto.bind(this)),
      timestamp: new Date().toISOString(),
    };
  }

  // ── GET by UUID ─────────────────────────────────────────────────────────
  async findById(id: string): Promise<CountrySingleResponseDto> {
    const country = await this.countryRepo.findOne({ where: { id } });

    if (!country) {
      throw new NotFoundException(`Country with id "${id}" not found`);
    }

    return {
      status:    true,
      message:   'Country found',
      data:      this.toDto(country),
      timestamp: new Date().toISOString(),
    };
  }

  // ── GET by ISO code (case-insensitive) ──────────────────────────────────
  async findByIsoCode(isoCode: string): Promise<CountrySingleResponseDto> {
    // Use UPPER() so "in", "In", "IN" all match
    const country = await this.countryRepo
      .createQueryBuilder('c')
      .where('UPPER(c.iso_code) = UPPER(:isoCode)', { isoCode })
      .getOne();

    if (!country) {
      throw new NotFoundException(
        `Country with ISO code "${isoCode.toUpperCase()}" not found`,
      );
    }

    return {
      status:    true,
      message:   'Country found',
      data:      this.toDto(country),
      timestamp: new Date().toISOString(),
    };
  }
}