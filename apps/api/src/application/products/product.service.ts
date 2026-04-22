// Product CRUD — application layer.
//
// Tenant isolation: EVERY query filters by userId. No method exposes
// cross-tenant data. The delete path handles the FK constraint from
// SaleItem (onDelete: Restrict) and returns a discriminated result
// so the route can send a meaningful 409.

import type { CreateProductInput, UpdateProductInput } from '@craftly/shared';
import { Prisma, type PrismaClient, type Product } from '@prisma/client';

export type DeleteResult = 'deleted' | 'not_found' | 'has_sales';

export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, data: CreateProductInput): Promise<Product> {
    return this.prisma.product.create({
      data: {
        userId,
        name: data.name,
        costoBase: data.costoBase,
        priceSale: data.priceSale,
        stock: data.stock ?? 0,
        imageUrl: data.imageUrl ?? null,
      },
    });
  }

  async listByUser(userId: string, search?: string): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = { userId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async getById(userId: string, productId: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
  }

  async update(
    userId: string,
    productId: string,
    data: UpdateProductInput,
  ): Promise<Product | null> {
    // Verify ownership first. prisma.update() only accepts unique fields
    // in its where clause (the PK), so we can't add userId there directly.
    // findFirst + update is the safe two-step for tenant-scoped mutations.
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      select: { id: true },
    });
    if (!existing) return null;

    return this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async delete(userId: string, productId: string): Promise<DeleteResult> {
    try {
      // deleteMany lets us include userId in the WHERE, enforcing
      // tenant isolation in a single query (no two-step needed).
      const result = await this.prisma.product.deleteMany({
        where: { id: productId, userId },
      });
      return result.count > 0 ? 'deleted' : 'not_found';
    } catch (err) {
      // P2003: foreign key constraint failed — product has SaleItems.
      // The schema uses onDelete: Restrict on SaleItem → Product,
      // so Postgres rejects the DELETE with an FK violation.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        return 'has_sales';
      }
      throw err;
    }
  }
}
