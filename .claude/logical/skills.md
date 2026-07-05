# NestJS Development Skills Guide

## Objective

You are a Senior Enterprise Architect and Lead NestJS Developer.

Generate production-ready NestJS code following clean architecture, SOLID principles, and enterprise development standards.

Always generate complete solutions including:

- Module
- Controller
- Service
- Repository
- DTOs
- Entities
- Interfaces
- Validation
- Swagger documentation
- Error handling
- Logging
- Unit-test stubs

---

# Technology Stack

## Backend

- NestJS
- TypeScript
- MySQL
- TypeORM
- Redis (optional)
- JWT Authentication
- Swagger/OpenAPI
- Axios/HttpService

## Deployment

- Docker
- Google Cloud Run
- Cloud SQL MySQL

---

# Folder Structure

```text
src 
├── common 
│ ├── constants 
│ ├── decorators 
│ ├── filters 
│ ├── guards 
│ ├── interceptors 
│ ├── middleware 
│ └── utils 
│ 
├── config 
│ 
├── database 
│ ├── entities 
│ ├── migrations 
│ └── repositories 
│ 
├── modules 
│ ├── patient 
│ │ ├── dto 
│ │ ├── entities 
│ │ ├── repositories 
│ │ ├── patient.controller.ts 
│ │ ├── patient.service.ts 
│ │ ├── patient.module.ts 
│ │ └── patient.repository.ts 
│ 
└── main.ts
```

# Controller Rules

- Thin controllers
- No business logic
- Call service layer
- Swagger decorators
- DTO validation

```Example:

@Get('')

@ApiOperation({ summary: 'Get by Id' })

@ApiParam({ name: 'id' })

findOne(
@Param('id', ParseIntPipe) id: number,
) {
return this.service.findById(id);
}```

# Service Rules

- Business logic only
- Call repositories
- No SQL

# Repository Rules

- Database access
- Stored procedures
- Transactions

```
Use TypeORM DataSource.

Example:

async getById(id: number) {
  return this.dataSource.query(
    'CALL usp_get_record(?)',
    [id],
  );
}
```
# DTO Rules

Use class-validator and class-transformer.
All request payloads must use DTOs.

```
Use:

class-validator
class-transformer

Example:

export class CreatePatientDto {

  @ApiProperty()

  @IsString()

  firstName: string;

  @ApiProperty()

  @IsString()

  lastName: string;

}
```
# Entity Rules

Use TypeORM entities.

```
Example:

@Entity('patient')

export class Patient {

  @PrimaryGeneratedColumn()

  id: number;

  @Column()

  firstName: string;

}
```
# Validation Rules

Use:
- IsString
- IsNumber
- IsEmail
- IsDateString
- IsOptional

# API Response Standard

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error",
  "errors": []
}
```

# Swagger Rules

Use:
- @ApiTags
- @ApiOperation
- @ApiResponse
- @ApiBearerAuth

# Error Handling

Use:
- BadRequestException
- NotFoundException
- ConflictException
- InternalServerErrorException

# Logging

Use NestJS Logger.

```
Example:

private readonly logger = new Logger(PatientService.name);

this.logger.log(
  'Creating patient',
);

this.logger.error(
  error.message,
  error.stack,
);
```

# Database Rules

- No synchronize=true in production
- Use migrations
- Support MySQL and Cloud SQL

# Stored Procedures

Use repository layer and parameterized calls.

# External APIs

Pattern:

Controller → Service → External API Service

# Authentication

- JWT Access Token
- JWT Refresh Token
- Guards
- RBAC

# Multi-Tenant

clinicId → Repository → Credentials

Never hardcode secrets.

# Redis

Cache:
- Clinic keys
- Lookups
- Provider lists

# Security

Use ConfigService and environment variables.

# Date Handling

Store:
- Date: YYYY-MM-DD
- Timestamp: UTC

# Pagination

Support:
- page
- pageSize
- sort
- search

# Testing

Generate:
- Service tests
- Controller tests

# Docker

Generate:
- Dockerfile
- .dockerignore
- Health endpoint

# Cloud Run

Support:
- PORT
- Environment variables
- Health checks

# Code Generation Rules

Whenever generating a module, always create:

1. Entity
2. DTOs
3. Repository
4. Service
5. Controller
6. Module
7. Swagger Docs
8. Validation
9. Error Handling
10. Test Skeletons

Always generate production-ready code.
