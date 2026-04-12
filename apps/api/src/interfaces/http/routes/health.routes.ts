// Public health check. No auth. Used by uptime monitors and `vercel dev`.

import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
};
