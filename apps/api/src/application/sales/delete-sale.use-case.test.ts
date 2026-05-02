import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { DeleteSaleUseCase, SaleNotFoundError } from './delete-sale.use-case.js';

function makeTx(
  saleResult: { id: string; items: Array<{ productId: string; quantity: number }> } | null,
) {
  return {
    sale: {
      findFirst: vi.fn().mockResolvedValue(saleResult),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    product: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function makePrisma(tx: ReturnType<typeof makeTx>) {
  return {
    $transaction: vi
      .fn()
      .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => Promise<void>) => cb(tx)),
  } as unknown as PrismaClient;
}

describe('DeleteSaleUseCase', () => {
  it('restores stock for each item and deletes the sale (multi-item)', async () => {
    const sale = {
      id: 'sale-1',
      items: [
        { productId: 'prod-a', quantity: 3 },
        { productId: 'prod-b', quantity: 1 },
      ],
    };
    const tx = makeTx(sale);
    const useCase = new DeleteSaleUseCase(makePrisma(tx));

    await useCase.execute({ userId: 'user-1', saleId: 'sale-1' });

    expect(tx.product.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-a', userId: 'user-1' },
      data: { stock: { increment: 3 } },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-b', userId: 'user-1' },
      data: { stock: { increment: 1 } },
    });
    expect(tx.sale.delete).toHaveBeenCalledOnce();
    expect(tx.sale.delete).toHaveBeenCalledWith({ where: { id: 'sale-1' } });
  });

  it('throws SaleNotFoundError without touching stock or delete when sale not found', async () => {
    const tx = makeTx(null);
    const useCase = new DeleteSaleUseCase(makePrisma(tx));

    await expect(useCase.execute({ userId: 'user-1', saleId: 'missing-sale' })).rejects.toThrow(
      SaleNotFoundError,
    );
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.sale.delete).not.toHaveBeenCalled();
  });

  it('restores stock once and deletes the sale (single-item)', async () => {
    const sale = {
      id: 'sale-2',
      items: [{ productId: 'prod-c', quantity: 5 }],
    };
    const tx = makeTx(sale);
    const useCase = new DeleteSaleUseCase(makePrisma(tx));

    await useCase.execute({ userId: 'user-2', saleId: 'sale-2' });

    expect(tx.product.updateMany).toHaveBeenCalledOnce();
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-c', userId: 'user-2' },
      data: { stock: { increment: 5 } },
    });
    expect(tx.sale.delete).toHaveBeenCalledOnce();
  });
});
