// Local dev entrypoint.
//
// Vercel does NOT run this file — it uses a Function handler (api/index.ts)
// that imports buildApp() directly. `server.ts` exists only for `npm run dev`
// and for self-hosted deployments.

import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env['PORT'] ?? 3001);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal error during startup:', err);
  process.exit(1);
});
