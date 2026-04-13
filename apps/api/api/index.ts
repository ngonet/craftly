// Vercel Function entrypoint.
//
// This file lives at `api/index.ts` and is auto-detected by Vercel as a
// serverless function. The catch-all rewrite in `vercel.json` routes ALL
// incoming requests here, then Fastify's router handles path matching.
//
// With Fluid Compute (default), the module is loaded ONCE and the resolved
// `appPromise` is reused across warm invocations — no cold-start Fastify
// boot on subsequent requests.

import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: Promise<import('fastify').FastifyInstance> | null = null;

async function initApp() {
  const { buildApp } = await import('../src/app.js');
  const app = await buildApp();
  await app.ready();
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (!appPromise) appPromise = initApp();
    const app = await appPromise;
    app.server.emit('request', req, res);
  } catch {
    appPromise = null;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
