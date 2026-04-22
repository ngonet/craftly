import type { Product, QuickSaleInput, SaleDto } from '@craftly/shared';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../shared/lib/api';
import { createQueryClientWrapper, createTestQueryClient } from '../../test-utils/query';
import { productKeys } from '../products/query-keys';
import { usePendingSales, useQuickSale } from './api';

vi.mock('../../shared/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  if (!resolve || !reject) {
    throw new Error('Deferred initialization failed');
  }

  return { promise, resolve, reject };
}

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    name: 'Vela de soja',
    costoBase: '10.00',
    priceSale: '20.00',
    stock: 5,
    imageUrl: null,
    createdAt: '2026-04-13T10:00:00.000Z',
    updatedAt: '2026-04-13T10:00:00.000Z',
    ...overrides,
  };
}

function createSale(productId: string, quantity = 2): SaleDto {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    userId: '22222222-2222-4222-8222-222222222222',
    metodoPago: 'EFECTIVO',
    total: (quantity * 20).toFixed(2),
    createdAt: '2026-04-13T10:05:00.000Z',
    items: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        saleId: '33333333-3333-4333-8333-333333333333',
        productId,
        quantity,
        unitPrice: '20.00',
        subtotal: (quantity * 20).toFixed(2),
      },
    ],
  };
}

function createSaleWithItems(items: Array<{ productId: string; quantity: number }>): SaleDto {
  const total = items.reduce((sum, item) => sum + item.quantity * 20, 0);

  return {
    id: '77777777-7777-4777-8777-777777777777',
    userId: '22222222-2222-4222-8222-222222222222',
    metodoPago: 'EFECTIVO',
    total: total.toFixed(2),
    createdAt: '2026-04-13T10:10:00.000Z',
    items: items.map((item, index) => ({
      id: `88888888-8888-4888-8888-${String(index + 1).padStart(12, '0')}`,
      saleId: '77777777-7777-4777-8777-777777777777',
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: '20.00',
      subtotal: (item.quantity * 20).toFixed(2),
    })),
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useQuickSale', () => {
  it('optimistically decrements product list and detail caches', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const otherProduct = createProduct({
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Jabón artesanal',
      stock: 8,
    });
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'EFECTIVO',
      items: [{ productId: product.id, quantity: 2 }],
    };

    queryClient.setQueryData(productKeys.list(), [product, otherProduct]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([
        { ...product, stock: 3 },
        otherProduct,
      ]);
      expect(queryClient.getQueryData(productKeys.detail(product.id))).toEqual({
        ...product,
        stock: 3,
      });
    });

    await act(async () => {
      deferred.resolve(createSale(product.id));
      await mutationPromise;
    });
  });

  it('rolls back product list and detail caches when the sale fails', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'TRANSFERENCIA',
      items: [{ productId: product.id, quantity: 2 }],
    };

    queryClient.setQueryData(productKeys.list(), [product]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([{ ...product, stock: 3 }]);
      expect(queryClient.getQueryData(productKeys.detail(product.id))).toEqual({
        ...product,
        stock: 3,
      });
    });

    await act(async () => {
      deferred.reject(new Error('sale failed'));
      await expect(mutationPromise).rejects.toThrow('sale failed');
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([product]);
      expect(queryClient.getQueryData(productKeys.detail(product.id))).toEqual(product);
    });
  });

  it('aggregates duplicate quick sale items before decrementing stock', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'EFECTIVO',
      items: [
        { productId: product.id, quantity: 1 },
        { productId: product.id, quantity: 2 },
      ],
    };

    queryClient.setQueryData(productKeys.list(), [product]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([{ ...product, stock: 2 }]);
      expect(queryClient.getQueryData(productKeys.detail(product.id))).toEqual({
        ...product,
        stock: 2,
      });
    });

    await act(async () => {
      deferred.resolve(createSale(product.id, 3));
      await mutationPromise;
    });
  });

  it('updates every cached product list that matches the list namespace', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const secondListProduct = createProduct({
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Difusor artesanal',
      stock: 4,
    });
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'EFECTIVO',
      items: [{ productId: product.id, quantity: 2 }],
    };

    queryClient.setQueryData(productKeys.list(), [product, secondListProduct]);
    queryClient.setQueryData(productKeys.list('vela'), [product]);
    queryClient.setQueryData(productKeys.list('difusor'), [secondListProduct]);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([
        { ...product, stock: 3 },
        secondListProduct,
      ]);
      expect(queryClient.getQueryData(productKeys.list('vela'))).toEqual([
        { ...product, stock: 3 },
      ]);
      expect(queryClient.getQueryData(productKeys.list('difusor'))).toEqual([secondListProduct]);
    });

    await act(async () => {
      deferred.resolve(createSale(product.id));
      await mutationPromise;
    });
  });

  it('invalidates products and sales queries after a successful sale', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const input: QuickSaleInput = {
      metodoPago: 'TRANSFERENCIA',
      items: [{ productId: product.id, quantity: 2 }],
    };
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queryClient.setQueryData(productKeys.list(), [product]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockResolvedValueOnce(createSale(product.id));

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith('/api/sales/quick', {
        method: 'POST',
        json: input,
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: productKeys.all,
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['sales'],
      });
    });
  });

  it('never decrements stock below zero during optimistic updates', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct({ stock: 1 });
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'EFECTIVO',
      items: [{ productId: product.id, quantity: 3 }],
    };

    queryClient.setQueryData(productKeys.list(), [product]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([{ ...product, stock: 0 }]);
      expect(queryClient.getQueryData(productKeys.detail(product.id))).toEqual({
        ...product,
        stock: 0,
      });
    });

    await act(async () => {
      deferred.resolve(createSale(product.id, 3));
      await mutationPromise;
    });
  });

  it('updates every matching product detail for multi-product sales', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const firstProduct = createProduct();
    const secondProduct = createProduct({
      id: '99999999-9999-4999-8999-999999999999',
      name: 'Cuenco cerámico',
      stock: 6,
    });
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'TRANSFERENCIA',
      items: [
        { productId: firstProduct.id, quantity: 2 },
        { productId: secondProduct.id, quantity: 1 },
      ],
    };

    queryClient.setQueryData(productKeys.list(), [firstProduct, secondProduct]);
    queryClient.setQueryData(productKeys.detail(firstProduct.id), firstProduct);
    queryClient.setQueryData(productKeys.detail(secondProduct.id), secondProduct);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useQuickSale(), { wrapper });

    const mutationPromise = result.current.mutateAsync(input);

    await waitFor(() => {
      expect(queryClient.getQueryData(productKeys.list())).toEqual([
        { ...firstProduct, stock: 3 },
        { ...secondProduct, stock: 5 },
      ]);
      expect(queryClient.getQueryData(productKeys.detail(firstProduct.id))).toEqual({
        ...firstProduct,
        stock: 3,
      });
      expect(queryClient.getQueryData(productKeys.detail(secondProduct.id))).toEqual({
        ...secondProduct,
        stock: 5,
      });
    });

    await act(async () => {
      deferred.resolve(
        createSaleWithItems([
          { productId: firstProduct.id, quantity: 2 },
          { productId: secondProduct.id, quantity: 1 },
        ]),
      );
      await mutationPromise;
    });
  });

  it('reports pending quick sales while the mutation is in flight', async () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const product = createProduct();
    const deferred = createDeferred<SaleDto>();
    const input: QuickSaleInput = {
      metodoPago: 'EFECTIVO',
      items: [{ productId: product.id, quantity: 2 }],
    };

    queryClient.setQueryData(productKeys.list(), [product]);
    queryClient.setQueryData(productKeys.detail(product.id), product);
    apiFetchMock.mockReturnValueOnce(deferred.promise);

    const quickSaleHook = renderHook(() => useQuickSale(), { wrapper });
    const pendingSalesHook = renderHook(() => usePendingSales(), { wrapper });

    const mutationPromise = quickSaleHook.result.current.mutateAsync(input);

    await waitFor(() => {
      expect(pendingSalesHook.result.current).toBe(1);
    });

    await act(async () => {
      deferred.resolve(createSale(product.id));
      await mutationPromise;
    });

    await waitFor(() => {
      expect(pendingSalesHook.result.current).toBe(0);
    });
  });
});
