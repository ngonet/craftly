# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Craftly is a SaaS inventory management app for craft fair artisans. Mobile-first PWA, offline-ready, "sale in 3 taps" UX. Auth via Supabase magic links, data on Supabase Postgres, deployed to Vercel.

## Monorepo Structure

npm workspaces with three packages:

- **`apps/api`** — Fastify 5 API with Prisma ORM. Hexagonal architecture (simplified). Deployed as a single Vercel Function via `api/index.ts` catch-all handler.
- **`apps/web`** — React 18 + Vite + Tailwind PWA. State-based router (no react-router). Supabase JS client for auth, `apiFetch` wrapper for API calls with automatic JWT injection.
- **`packages/shared`** — Zod schemas and TypeScript contracts shared between API and Web. Consumed as raw `.ts` (no build step).

## Common Commands

```bash
# Development
npm run dev:api          # API on :3001 (tsx watch, loads .env from root)
npm run dev:web          # Web on :5173 (Vite, proxies /api to :3001)

# Linting & formatting (Biome)
npm run lint             # Check all
npm run lint:fix         # Auto-fix
npm run format           # Format all

# Type checking
npm run typecheck        # All workspaces

# Testing (Vitest — workspace mode)
npm run test             # Run all tests (api + web)
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage (v8)
npm run test:api         # API workspace only
npm run test:web         # Web workspace only

# Database (Prisma — runs from apps/api, loads root .env)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create & apply migration (dev)
npm run db:deploy        # Apply pending migrations (prod)
```

Prisma scripts use `node --env-file=../../.env` to load the root `.env` because Prisma CLI doesn't natively resolve workspace-relative env files.

## Architecture Details

### API (apps/api)

**Entrypoints**:
- `src/server.ts` — local dev only (`app.listen()`)
- `api/index.ts` — Vercel Function handler. Module-level `buildApp()` promise reused across warm Fluid Compute invocations.
- `src/app.ts` — Fastify factory. Registers CORS, auth plugin, and all route prefixes. Both entrypoints consume this.

**Auth**: Supabase JWT verification via `jose`. Plugin at `src/interfaces/http/middleware/auth.ts` supports JWKS (preferred) or HS256 fallback. Routes opt-in with `preHandler: fastify.authenticate`.

**Prisma singleton**: `src/infrastructure/prisma/client.ts` — one PrismaClient per process, shared across warm invocations. Supabase pooler handles connection multiplexing.

**Key business logic**: `QuickSaleUseCase` uses atomic conditional UPDATE (`stock >= qty`) to prevent race conditions on concurrent sales. Price snapshots are immutable — SaleItem.unitPrice is frozen at sale time.

**DB connections**: `DATABASE_URL` = Supabase pooler (port 6543, for runtime queries). `DIRECT_URL` = direct connection (port 5432, for migrations only).

### Web (apps/web)

**No react-router** — uses a state-machine router (`src/shared/lib/router.tsx`) with ~4 screens. Tab-based navigation (Productos | Vender).

**Auth flow**: Supabase magic link OTP. `AuthProvider` wraps the app and exposes `useAuth()`. `apiFetch()` automatically attaches the Bearer token from the current Supabase session.

**API client**: `src/shared/lib/api.ts` — in dev, Vite proxies `/api/*` to `:3001`. In prod, `VITE_API_URL` env var points to the API domain.

### Shared (packages/shared)

Zod schemas for common types, products, and sales. Exported as raw TypeScript — no compilation needed. `MetodoPago` enum: `EFECTIVO | TRANSFERENCIA`.

## Environment

Root `.env` file (see `.env.example`). Required vars:
- `DATABASE_URL`, `DIRECT_URL` — Supabase Postgres connection strings
- `SUPABASE_JWT_ISSUER` — e.g. `https://<ref>.supabase.co/auth/v1`
- Either `SUPABASE_JWKS_URL` or `SUPABASE_JWT_SECRET` (at least one)

Web-specific (prefixed `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.

## Code Style

- **Biome** for linting and formatting. Single quotes, semicolons, 2-space indent, 100 char line width.
- `noExplicitAny: error`, `noUnusedVariables: error`, `noUnusedImports: error`.
- `verbatimModuleSyntax: true` — use `import type` / `export type` for type-only imports.
- `noUncheckedIndexedAccess: true` — indexed access returns `T | undefined`.
- ESM throughout (`"type": "module"`). Use `.js` extensions in relative imports within the API.

## Deployment

Two separate Vercel projects, each with its own `vercel.json`:
- **API** (`apps/api/vercel.json`): catch-all rewrite to `api/index.ts` Vercel Function. Build command runs `prisma generate`.
- **Web** (`apps/web/vercel.json`): Vite framework, SPA fallback rewrite to `index.html`, immutable cache headers on `/assets/`.

## Supabase CLI

Initialized at repo root (`supabase/config.toml`). Linked to remote project. Use `supabase` commands from the repo root.
