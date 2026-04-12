// Sales routes.
//
// Factory pattern: the plugin receives the PrismaClient via closure so
// the route can construct its use case once per process. This keeps the
// handler tight and makes the use case trivially unit-testable (pass a
// mock PrismaClient).

import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { QuickSaleInputSchema } from '@craftly/shared';
import {
  EmptySaleError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
  QuickSaleUseCase,
} from '../../../application/sales/quick-sale.use-case.js';

export function createSalesRoutes(prisma: PrismaClient): FastifyPluginAsync {
  const quickSale = new QuickSaleUseCase(prisma);

  return async (fastify) => {
    // ── POST /quick — Venta Rápida ─────────────────────
    fastify.post(
      '/quick',
      { preHandler: fastify.authenticate },
      async (request, reply) => {
        const parsed = QuickSaleInputSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          });
        }

        try {
          const sale = await quickSale.execute({
            userId: request.user.id,
            metodoPago: parsed.data.metodoPago,
            items: parsed.data.items,
          });
          return reply.code(201).send(sale);
        } catch (err) {
          if (
            err instanceof ProductNotFoundError ||
            err instanceof InsufficientStockError ||
            err instanceof EmptySaleError ||
            err instanceof InvalidQuantityError
          ) {
            return reply.code(err.statusCode).send({
              error: err.code,
              message: err.message,
              ...('productId' in err ? { productId: err.productId } : {}),
            });
          }
          // Unknown error — let Fastify's default handler log + respond 500.
          throw err;
        }
      },
    );
  };
}
