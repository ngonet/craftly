// ═══════════════════════════════════════════════════════════════
// QuickSaleUseCase — "Venta Rápida"
//
// Atomic transaction that:
//   1. Reads products owned by the user (price snapshot + ownership check)
//   2. Decrements stock SAFELY using a conditional UPDATE (atomic check-
//      and-decrement at the row level — no race with concurrent sales)
//   3. Creates the Sale + SaleItems with the price snapshot
//
// ── The race condition, and how we handle it ─────────────────
//
// Naive approach:
//     stock = SELECT stock FROM products WHERE id = ?
//     if (stock >= qty) UPDATE products SET stock = stock - qty WHERE id = ?
//
// TWO concurrent transactions on the same product (stock=5, qty=3 each):
//     T1: reads stock=5   → check passes
//     T2: reads stock=5   → check passes
//     T1: writes stock=2
//     T2: writes stock=2  ← WRONG. Should be -1, which is forbidden.
//     Final stock = 2. We oversold by 3.
//
// Safe approach (what this code does):
//     UPDATE products SET stock = stock - qty
//     WHERE id = ? AND userId = ? AND stock >= qty
//
// Postgres executes the WHERE + UPDATE as ONE atomic statement. Only one
// transaction wins. The loser gets `count = 0` and we throw a 409. No
// serializable isolation needed. No raw SQL. Beautiful.
//
// ── Price snapshots ──────────────────────────────────────────
//
// unitPrice stored in SaleItem is a SNAPSHOT of priceSale at sale time.
// If the artisan raises prices tomorrow, yesterday's sales don't change.
// History is immutable — this is a hard business invariant.
// ═══════════════════════════════════════════════════════════════

import { Prisma, type PrismaClient } from '@prisma/client';
import type { MetodoPago } from '@craftly/shared';

// ── Input ──────────────────────────────────────────────────

export interface QuickSaleLineInput {
  productId: string;
  quantity: number;
}

export interface QuickSaleInput {
  userId: string;
  metodoPago: MetodoPago;
  items: QuickSaleLineInput[];
}

// ── Errors (Fastify respects statusCode/code on thrown errors) ──

export class EmptySaleError extends Error {
  readonly statusCode = 400;
  readonly code = 'EMPTY_SALE';
  constructor() {
    super('sale must contain at least one item');
    this.name = 'EmptySaleError';
  }
}

export class InvalidQuantityError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_QUANTITY';
  constructor(
    readonly productId: string,
    readonly quantity: number,
  ) {
    super(`invalid quantity ${quantity} for product ${productId}`);
    this.name = 'InvalidQuantityError';
  }
}

export class ProductNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'PRODUCT_NOT_FOUND';
  constructor(readonly productId: string) {
    super(`product ${productId} not found or not owned by user`);
    this.name = 'ProductNotFoundError';
  }
}

export class InsufficientStockError extends Error {
  readonly statusCode = 409;
  readonly code = 'INSUFFICIENT_STOCK';
  constructor(readonly productId: string) {
    super(`insufficient stock for product ${productId}`);
    this.name = 'InsufficientStockError';
  }
}

// ── Output type — Sale with items, inferred from Prisma ────

export type QuickSaleOutput = Prisma.SaleGetPayload<{ include: { items: true } }>;

// ── Use case ───────────────────────────────────────────────

export class QuickSaleUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: QuickSaleInput): Promise<QuickSaleOutput> {
    if (input.items.length === 0) {
      throw new EmptySaleError();
    }

    // Consolidate duplicate productIds. If the user scans the same product
    // twice, we want ONE UPDATE with total quantity — not two UPDATEs each
    // seeing the post-first-update stock (would reject the second as short).
    const consolidated = new Map<string, number>();
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new InvalidQuantityError(item.productId, item.quantity);
      }
      consolidated.set(
        item.productId,
        (consolidated.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Load products (price snapshot + ownership check).
        //    This read is NOT locked — we rely on the atomic UPDATE
        //    in step 3 to enforce the stock invariant.
        const productIds = [...consolidated.keys()];
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, userId: input.userId },
          select: { id: true, priceSale: true },
        });

        if (products.length !== productIds.length) {
          const found = new Set(products.map((p) => p.id));
          const missing = productIds.find((id) => !found.has(id));
          // `missing` is guaranteed to exist because lengths differ.
          throw new ProductNotFoundError(missing as string);
        }

        // 2. Compute line items + total using the price snapshot.
        const lineItems: Array<{
          productId: string;
          quantity: number;
          unitPrice: Prisma.Decimal;
          subtotal: Prisma.Decimal;
        }> = [];

        let total = new Prisma.Decimal(0);

        for (const product of products) {
          // Safe non-null: product.id was sourced from `consolidated.keys()`.
          const quantity = consolidated.get(product.id) as number;
          const unitPrice = product.priceSale;
          const subtotal = unitPrice.mul(quantity);
          total = total.add(subtotal);

          lineItems.push({
            productId: product.id,
            quantity,
            unitPrice,
            subtotal,
          });
        }

        // 3. Atomic stock decrement — the critical step.
        //    Postgres executes WHERE + UPDATE atomically. If any row fails
        //    (not owned, insufficient stock, deleted between read and now),
        //    result.count === 0 and we abort, rolling back the transaction.
        for (const [productId, quantity] of consolidated) {
          const result = await tx.product.updateMany({
            where: {
              id: productId,
              userId: input.userId,
              stock: { gte: quantity },
            },
            data: {
              stock: { decrement: quantity },
            },
          });

          if (result.count === 0) {
            // Could be insufficient stock OR product was deleted mid-flight.
            // For the client, 409 with productId is enough context.
            throw new InsufficientStockError(productId);
          }
        }

        // 4. Create the Sale aggregate in a single insert + nested items.
        const sale = await tx.sale.create({
          data: {
            userId: input.userId,
            metodoPago: input.metodoPago,
            total,
            items: {
              createMany: { data: lineItems },
            },
          },
          include: { items: true },
        });

        return sale;
      },
      {
        // Read committed is Postgres default and sufficient here because
        // the stock invariant is protected by the conditional UPDATE, not
        // by isolation level. Serializable would be safer but expensive.
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000, // ms to wait for a transaction slot
        timeout: 10_000, // ms max transaction duration
      },
    );
  }
}
