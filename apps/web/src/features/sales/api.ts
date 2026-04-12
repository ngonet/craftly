// Sales API hooks — TanStack Query mutations.
//
// Quick sale invalidates the products cache because stock changed.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QuickSaleInput, SaleDto } from '@craftly/shared';
import { apiFetch } from '../../shared/lib/api';

export function useQuickSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuickSaleInput) =>
      apiFetch<SaleDto>('/api/sales/quick', { method: 'POST', json: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
