# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev        # Start with watch mode (NODE_ENV=development)
npm run start:debug      # Start with debugger + watch

# Build & Production
npm run build            # Compile TypeScript via nest build
npm run start:prod       # Run compiled output from dist/

# Testing
npm run test             # Run unit tests
npm run test:watch       # Unit tests in watch mode
npm run test:cov         # Unit tests with coverage
npm run test:e2e         # End-to-end tests

# Code Quality
npm run lint             # ESLint with auto-fix
npm run format           # Prettier formatting
```

## Architecture

**NestJS REST API** for a survey/polling platform with multi-tenant dental clinic support. All routes are prefixed with `/api/v1`. API docs available at `/api-docs`.

### Module Structure

Feature modules live in `src/modules/`. Each follows the pattern: `module.ts` → `controller.ts` → `service.ts` → `entity/*.entity.ts` + `dto/`.

Key modules:
- **survey** — Core survey creation and management
- **vote** — Survey voting/polling logic
- **auth** — JWT authentication, password reset, login history (`src/modules/auth/`)
- **user** — User profiles and management
- **chat** — Claude AI (Anthropic SDK) chat integration at `POST /chat/request`
- **appointment** — OpenDental API integration for dental appointments
- **practice** / **clinic-keys** — Multi-tenant dental practice management
- **blog** — Posts, comments, likes, newsletter
- **party** / **party-master** / **survey-party** — Party/organization associations
- **country** — Candidate, constituency, state, district entities
- **audit** — Global audit logging via interceptor

Shared code (guards, filters, interceptors, decorators, DTOs) lives in `src/common/`.

### Database

**TypeORM + MySQL 8.0.** Entities auto-discovered via `src/**/*.entity.ts`. Migrations in `src/database/migrations/` — run on startup when `DB_MIGRATIONS_RUN=true`. Synchronize is enabled in development, disabled in production.

Connection configured via `src/config/configuration.ts` using `registerAs()` typed config sections: `database`, `jwt`, `admin`, `smtp`, `google`.

### Environment Configuration

Uses environment-specific files: `.env.development`, `.env.production`. Key variables:

```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
JWT_SECRET, JWT_EXPIRES_IN          # JWT config (default 4h)
SMTP_*                              # Email via Ionos SMTP
GCP_*, GOOGLE_CLOUD_PRIVATE_KEY     # Google Cloud Storage
OPENDENTAL_*, APPOINTMENT_*         # OpenDental API
FRONTEND_URL, ENCRYPTION_KEY
```

### Request Lifecycle

Bootstrap (`src/main.ts`) waits for DB availability before starting, then registers:
- **GlobalPipe:** `ValidationPipe` with transformation
- **GlobalFilter:** `AllExceptionsFilter`
- **GlobalInterceptor:** `LoggingInterceptor`
- Static assets served from `/src/assets` at `/static`
- CORS enabled for all origins

### Claude AI Integration

Already integrated in `src/modules/chat/` using `@anthropic-ai/sdk`. Model: `claude-sonnet-4-20250514`, max tokens: 1000. Endpoint accepts `{ messages: any[], system: string }`.

### Deployment

Docker images (`Dockerfile`, `Dockerfile.dev`, `Dockerfile.prod`) with `docker-compose.yml` for local MySQL. Deployed to Google Cloud Run via `cloudbuild.yaml`.
