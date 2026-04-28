// ═══════════════════════════════════════════════════════════════
// DeleteSaleUseCase — eliminar venta + restaurar stock
//
// Borra una venta del usuario y devuelve las cantidades vendidas
// al stock de cada producto. Hard delete: SaleItem rows caen por
// `onDelete: Cascade` en el schema.
//
// Ownership check + load se hace en una sola query (findFirst con
// where: { id, userId }). Si la venta no existe o pertenece a
// otro user, devolvemos 404 — no diferenciamos para no leakear
// la existencia de recursos ajenos.
// ═══════════════════════════════════════════════════════════════

import { Prisma, type PrismaClient } from '@prisma/client';

export class SaleNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'SALE_NOT_FOUND';
  constructor(readonly saleId: string) {
    super(`sale ${saleId} not found or not owned by user`);
    this.name = 'SaleNotFoundError';
  }
}

export interface DeleteSaleInput {
  userId: string;
  saleId: string;
}

export class DeleteSaleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DeleteSaleInput): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findFirst({
          where: { id: input.saleId, userId: input.userId },
          select: {
            id: true,
            items: { select: { productId: true, quantity: true } },
          },
        });

        if (!sale) {
          throw new SaleNotFoundError(input.saleId);
        }

        // Restore stock — increment is safe under concurrency (no invariant
        // to violate). Scoped by userId as defense-in-depth.
        for (const item of sale.items) {
          await tx.product.updateMany({
            where: { id: item.productId, userId: input.userId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Cascade removes SaleItem rows (Sale.items onDelete: Cascade).
        await tx.sale.delete({ where: { id: sale.id } });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 10_000,
      },
    );
  }
}
