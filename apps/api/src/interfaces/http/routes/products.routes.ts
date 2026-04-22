// Product CRUD routes.
//
// All routes are auth-gated via a scope-level preHandler — no need
// to attach `fastify.authenticate` on each individual route.
//
// URL params are validated as UUIDs BEFORE hitting the DB. This
// prevents wasted queries on malformed IDs and returns a clean 400
// instead of a confusing Prisma error.

import { CreateProductInputSchema, UpdateProductInputSchema, Uuid } from '@craftly/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { ProductService } from '../../../application/products/product.service.js';

export function createProductRoutes(prisma: PrismaClient): FastifyPluginAsync {
  const service = new ProductService(prisma);

  return async (fastify) => {
    // Scope-level auth — applies to ALL routes in this plugin.
    fastify.addHook('preHandler', fastify.authenticate);

    // ── POST / — Create product ───────────────────────
    fastify.post('/', async (request, reply) => {
      const parsed = CreateProductInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const product = await service.create(request.user.id, parsed.data);
      return reply.code(201).send(product);
    });

    // ── GET / — List products (optional search) ───────
    fastify.get<{ Querystring: { search?: string } }>('/', async (request) => {
      return service.listByUser(request.user.id, request.query.search);
    });

    // ── GET /:id — Get product by ID ──────────────────
    fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const idResult = Uuid.safeParse(request.params.id);
      if (!idResult.success) {
        return reply.code(400).send({ error: 'INVALID_ID' });
      }

      const product = await service.getById(request.user.id, idResult.data);
      if (!product) {
        return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
      }
      return product;
    });

    // ── PATCH /:id — Partial update ───────────────────
    fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const idResult = Uuid.safeParse(request.params.id);
      if (!idResult.success) {
        return reply.code(400).send({ error: 'INVALID_ID' });
      }

      const parsed = UpdateProductInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      if (Object.keys(parsed.data).length === 0) {
        return reply.code(400).send({ error: 'EMPTY_UPDATE' });
      }

      const product = await service.update(request.user.id, idResult.data, parsed.data);
      if (!product) {
        return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
      }
      return product;
    });

    // ── DELETE /:id — Delete product ──────────────────
    fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
      const idResult = Uuid.safeParse(request.params.id);
      if (!idResult.success) {
        return reply.code(400).send({ error: 'INVALID_ID' });
      }

      const result = await service.delete(request.user.id, idResult.data);

      switch (result) {
        case 'deleted':
          return reply.code(204).send();
        case 'not_found':
          return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
        case 'has_sales':
          return reply.code(409).send({
            error: 'PRODUCT_HAS_SALES',
            message: 'cannot delete a product with existing sales history',
          });
      }
    });
  };
}
