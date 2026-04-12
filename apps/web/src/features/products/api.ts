// Product API hooks — TanStack Query wrappers over apiFetch.
//
// Each mutation invalidates the product list so the UI stays fresh.
// No optimistic updates yet — fair wifi is unreliable enough that
// we want server confirmation before showing changes.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from '@craftly/shared';
import { apiFetch } from '../../shared/lib/api';

const PRODUCTS_KEY = ['products'] as const;

export function useProducts(search?: string) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, { search }],
    queryFn: () =>
      apiFetch<Product[]>(
        `/api/products${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, id],
    queryFn: () => apiFetch<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      apiFetch<Product>('/api/products', { method: 'POST', json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      apiFetch<Product>(`/api/products/${id}`, { method: 'PATCH', json: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}
