# Craftly

Craftly es un SaaS de gestión de inventario para artesanos de ferias.

La app está pensada mobile-first y resuelve tres flujos centrales:

- gestión de productos
- venta rápida en pocos taps
- cierre de caja diario

## Stack

- Web: React + Vite + Tailwind + TanStack Query
- API: Fastify + Prisma
- Auth y backend services: Supabase
- Shared contracts: Zod + TypeScript
- Monorepo: npm workspaces

## Estructura

```text
apps/
  api/      Fastify API + Prisma
  web/      React app (Vite + PWA)
packages/
  shared/   Schemas y tipos compartidos
supabase/   Configuración del CLI de Supabase
```

## Requisitos

- Node.js 20+
- npm 10+
- un proyecto de Supabase

## Instalación

```bash
npm install
```

## Variables de entorno

El proyecto usa un `.env` en la raíz del repo.

Tomá como base el template:

```bash
cp .env.example .env
```

Variables importantes:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_JWKS_URL` o `SUPABASE_JWT_SECRET`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

## Desarrollo local

Levantar API:

```bash
npm run dev:api
```

Levantar Web:

```bash
npm run dev:web
```

Por defecto:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## Base de datos

Generar cliente Prisma:

```bash
npm run db:generate
```

Crear y aplicar migraciones en desarrollo:

```bash
npm run db:migrate -- --name init
```

Aplicar migraciones en deploy:

```bash
npm run db:deploy
```

## Scripts útiles

```bash
npm run lint
npm run lint:fix
npm run format
npm run typecheck
npm run build
npm run test
npm run test:api
npm run test:web
```

## Arquitectura

### `apps/api`

La API expone endpoints para:

- productos
- ventas rápidas
- resumen diario de ventas
- health check

La autenticación usa tokens de Supabase y sincroniza el usuario autenticado con la tabla local `users` para mantener integridad referencial en Prisma.

### `apps/web`

La app web está pensada como PWA mobile-first.

Incluye:

- listado y edición de productos
- venta rápida
- cierre de caja diario
- subida de imágenes de producto
- soporte de UX offline para ventas usando TanStack Query

### `packages/shared`

Acá viven los contratos compartidos entre frontend y backend:

- schemas de Zod
- tipos TypeScript
- validación de payloads

## Supabase CLI

El repo incluye configuración de Supabase CLI en `supabase/`.

Flujos comunes:

```bash
supabase login
supabase link --project-ref <project-ref>
```

Si necesitás automatizar comandos no interactivos, revisá las variables opcionales del `.env.example`:

- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

## Deploy

La API está preparada para correr como función de Vercel.

Antes de deployar, asegurate de configurar en el entorno remoto las mismas variables necesarias que usás localmente, especialmente:

- conexión Prisma
- issuer/JWKS de Supabase
- variables `VITE_*` del frontend

## Estado actual del producto

Hoy el repo cubre:

- inventario de productos
- quick sale
- daily summary
- imágenes de producto
- autenticación con Supabase

## Notas

- `DATABASE_URL` y `DIRECT_URL` cumplen roles distintos: runtime vs migraciones.
- La web toma variables desde el `.env` raíz del monorepo.
- El backend valida el entorno al iniciar; si falta algo crítico, falla rápido.
