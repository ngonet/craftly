// PrismaClient singleton.
//
// In Fluid Compute (default on Vercel) the Node process is REUSED across
// concurrent invocations. A module-level singleton is exactly what we want:
// one PrismaClient per process, shared across warm requests. The Supabase
// pooler handles connection multiplexing at the DB side, so we don't need
// to manage a connection pool in the app.
//
// Do NOT call `new PrismaClient()` in request handlers — that would open a
// new pool on every warm invocation and exhaust the Supabase pooler.

import { PrismaClient } from '@prisma/client';

let client: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (client) return client;

  client = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

  return client;
}
