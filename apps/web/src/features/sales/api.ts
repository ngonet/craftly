// Sales API hooks — TanStack Query mutations + queries.
//
// ── Optimistic Updates (useQuickSale) ───────────────────────
//
// When the artisan taps "Vender", the UI must respond INSTANTLY.
// Fair wifi is unreliable — waiting for a server round-trip means
// the sale "freezes" for seconds, which kills the 3-tap flow.
//
// Strategy:
//   onMutate  → snapshot the products cache, optimistically decrement
//               stock for every item in the cart. Return snapshot for rollback.
//   onError   → rollback to snapshot. The mutation stays in a "pending"
//               state and TanStack Query retries it automatically when
//               onlineManager detects reconnection (networkMode: offlineFirst).
//   onSuccess → invalidate products + sales caches to get fresh server state.
//   onSettled → always invalidate to reconcile optimistic ↔ server state.
//
// ── Pending Sales ───────────────────────────────────────────
//
// We expose `usePendingSales()` which reads the mutation cache to show
// the artisan how many sales are waiting to sync. This lets the UI
// display a "2 ventas pendientes" badge when offline.

import type { DailySummary, Product, QuickSaleInput, SaleDto } from '@craftly/shared';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../shared/lib/api';
import { productKeys } from '../products/query-keys';

// ── Query keys ────────────────────────────────────────────

const SALES_KEY = ['sales'] as const;
const DAILY_SUMMARY_KEY = ['sales', 'daily-summary'] as const;

// ── Mutation keys (for useMutationState filtering) ────────

const QUICK_SALE_KEY = ['quick-sale'] as const;

function isProductCacheEntry(value: unknown): value is Product {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'stock' in value &&
    typeof value.stock === 'number'
  );
}

function applyStockDecrementsToList(
  cachedData: Product[] | undefined,
  decrements: Map<string, number>,
): Product[] | undefined {
  if (!cachedData) {
    return cachedData;
  }

  return cachedData.map((product) => {
    const dec = decrements.get(product.id);
    if (dec === undefined) return product;
    return {
      ...product,
      stock: Math.max(0, product.stock - dec),
    };
  });
}

function applyStockDecrementToDetail(
  cachedData: Product | undefined,
  decrements: Map<string, number>,
): Product | undefined {
  if (!isProductCacheEntry(cachedData)) {
    return cachedData;
  }

  const dec = decrements.get(cachedData.id);
  if (dec === undefined) {
    return cachedData;
  }

  return {
    ...cachedData,
    stock: Math.max(0, cachedData.stock - dec),
  };
}

// ── useQuickSale — optimistic mutation ────────────────────

export function useQuickSale() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: QUICK_SALE_KEY,
    mutationFn: (data: QuickSaleInput) =>
      apiFetch<SaleDto>('/api/sales/quick', { method: 'POST', json: data }),

    onMutate: async (newSale) => {
      // 1. Cancel outgoing product refetches so they don't overwrite
      //    our optimistic update mid-flight.
      await qc.cancelQueries({ queryKey: productKeys.lists });
      await qc.cancelQueries({ queryKey: productKeys.details });

      // 2. Snapshot the current products cache for rollback.
      const previousProductLists = qc.getQueriesData<Product[]>({
        queryKey: productKeys.lists,
      });
      const previousProductDetails = qc.getQueriesData<Product>({
        queryKey: productKeys.details,
      });

      // 3. Optimistically decrement stock in every matching query.
      //    There may be multiple product queries (different search terms).
      const decrements = new Map<string, number>();
      for (const item of newSale.items) {
        decrements.set(item.productId, (decrements.get(item.productId) ?? 0) + item.quantity);
      }

      qc.setQueriesData<Product[] | undefined>({ queryKey: productKeys.lists }, (old) =>
        applyStockDecrementsToList(old, decrements),
      );
      qc.setQueriesData<Product | undefined>({ queryKey: productKeys.details }, (old) =>
        applyStockDecrementToDetail(old, decrements),
      );

      // Return context for rollback.
      return { previousProductLists, previousProductDetails };
    },

    onError: (_err, _newSale, context) => {
      // Rollback: restore every product query to its pre-mutation state.
      if (context?.previousProductLists) {
        for (const [queryKey, data] of context.previousProductLists) {
          qc.setQueryData(queryKey, data);
        }
      }
      if (context?.previousProductDetails) {
        for (const [queryKey, data] of context.previousProductDetails) {
          qc.setQueryData(queryKey, data);
        }
      }
      // The mutation stays in the cache with status 'error'.
      // TanStack Query will auto-retry (networkMode: offlineFirst + retry: 3).
    },

    onSettled: () => {
      // Whether success or final failure, reconcile with the server.
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: SALES_KEY });
    },
  });
}

// ── usePendingSales — count of in-flight/retrying mutations ─

export function usePendingSales(): number {
  const pendingStates = useMutationState({
    filters: { mutationKey: QUICK_SALE_KEY, status: 'pending' },
    select: (mutation) => mutation.state.status,
  });
  return pendingStates.length;
}

// ── useDailySummary — Cierre de Caja query ────────────────

export function useDailySummary() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery({
    queryKey: [...DAILY_SUMMARY_KEY, tz],
    queryFn: () => apiFetch<DailySummary>(`/api/sales/daily-summary?tz=${encodeURIComponent(tz)}`),
    // Summary changes every sale — keep it fresh.
    staleTime: 1000 * 30, // 30 seconds
  });
}
