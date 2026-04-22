// App factory. Builds the Fastify instance but does NOT call .listen().
//
// Two consumers:
//   - src/server.ts    → local dev, wraps with .listen()
//   - api/index.ts     → Vercel Function handler (to be added), reuses
//                        the built instance across warm invocations
//
// The factory is async because plugin registration is async.

import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import { loadEnv } from './config/env.js';
import { getPrismaClient } from './infrastructure/prisma/client.js';
import {
  createCorsHeaders,
  resolveAllowedOrigin,
  resolveAllowedOrigins,
} from './interfaces/http/cors.js';
import authPlugin from './interfaces/http/middleware/auth.js';
import { healthRoutes } from './interfaces/http/routes/health.routes.js';
import { createProductRoutes } from './interfaces/http/routes/products.routes.js';
import { createSalesRoutes } from './interfaces/http/routes/sales.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();
  const prisma = getPrismaClient();
  const allowedOrigins = resolveAllowedOrigins(env.CORS_ORIGIN);

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    // Use incoming X-Request-Id if present, else a fresh UUID.
    // Enables request correlation across the stack.
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.length > 0) return header;
      return randomUUID();
    },
    // Tighten request body limits — 3-tap sale payloads are tiny.
    bodyLimit: 64 * 1024, // 64 KB
  });

  app.addHook('onRequest', async (request, reply) => {
    const allowedOrigin = resolveAllowedOrigin(allowedOrigins, request.headers.origin);
    if (!allowedOrigin) return;

    const corsHeaders = createCorsHeaders(allowedOrigin);

    for (const [headerName, headerValue] of Object.entries(corsHeaders)) {
      reply.header(headerName, headerValue);
    }

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
    }
  });

  app.get('/', async () => ({
    name: 'Craftly API',
    status: 'ok',
    health: '/health',
  }));

  // ── Auth ──────────────────────────────────────────────
  await app.register(authPlugin, {
    jwksUrl: env.SUPABASE_JWKS_URL,
    jwtSecret: env.SUPABASE_JWT_SECRET,
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
  });

  // ── Routes ────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(createProductRoutes(prisma), { prefix: '/api/products' });
  await app.register(createSalesRoutes(prisma), { prefix: '/api/sales' });

  // ── Graceful shutdown ─────────────────────────────────
  // Fires on local dev Ctrl+C. In serverless the process is torn down
  // externally, but keeping the hook is cheap and keeps dev clean.
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
