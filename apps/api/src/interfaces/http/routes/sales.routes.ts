// Sales routes.
//
// Factory pattern: the plugin receives the PrismaClient via closure so
// the route can construct its use case once per process. This keeps the
// handler tight and makes the use case trivially unit-testable (pass a
// mock PrismaClient).

import { QuickSaleInputSchema } from '@craftly/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import {
  DeleteSaleUseCase,
  SaleNotFoundError,
} from '../../../application/sales/delete-sale.use-case.js';
import { GetDailySummaryUseCase } from '../../../application/sales/get-daily-summary.use-case.js';
import {
  EmptySaleError,
  InsufficientStockError,
  InvalidQuantityError,
  ProductNotFoundError,
  QuickSaleUseCase,
} from '../../../application/sales/quick-sale.use-case.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSalesRoutes(prisma: PrismaClient): FastifyPluginAsync {
  const quickSale = new QuickSaleUseCase(prisma);
  const dailySummary = new GetDailySummaryUseCase(prisma);
  const deleteSale = new DeleteSaleUseCase(prisma);

  return async (fastify) => {
    // ── POST /quick — Venta Rápida ─────────────────────
    fastify.post('/quick', { preHandler: fastify.authenticate }, async (request, reply) => {
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
    });

    // ── GET /daily-summary — Cierre de Caja ────────────
    fastify.get('/daily-summary', { preHandler: fastify.authenticate }, async (request, reply) => {
      const { tz } = request.query as { tz?: string };

      // Validate the timezone is a real IANA name. Intl.DateTimeFormat
      // throws on invalid timezones — cheap and reliable.
      const timezone = tz ?? 'UTC';
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        return reply.code(400).send({
          error: 'INVALID_TIMEZONE',
          message: `Unknown timezone: "${timezone}"`,
        });
      }

      const result = await dailySummary.execute({
        userId: request.user.id,
        timezone,
      });

      return reply.send(result);
    });

    // ── DELETE /:id — eliminar venta + restaurar stock ─
    fastify.delete('/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
      const { id } = request.params as { id: string };

      if (!UUID_REGEX.test(id)) {
        return reply.code(400).send({
          error: 'INVALID_SALE_ID',
          message: 'sale id must be a valid UUID',
        });
      }

      try {
        await deleteSale.execute({ userId: request.user.id, saleId: id });
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof SaleNotFoundError) {
          return reply.code(err.statusCode).send({
            error: err.code,
            message: err.message,
          });
        }
        throw err;
      }
    });
  };
}
