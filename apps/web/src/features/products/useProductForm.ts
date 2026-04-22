import { CreateProductInputSchema, UpdateProductInputSchema } from '@craftly/shared';
import { subtractMoney } from '../../shared/lib/money';
import { useEffect, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useAuth } from '../../shared/lib/auth';
import { useRouter } from '../../shared/lib/router';
import type { ImageUploadRef } from './ImageUpload';
import { useCreateProduct, useDeleteProduct, useProduct, useUpdateProduct } from './api';

interface UseProductFormOptions {
  productId?: string;
}

export function useProductForm({ productId }: UseProductFormOptions) {
  const { goBack } = useRouter();
  const { user } = useAuth();
  const { data: existing, isLoading } = useProduct(productId);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [name, setName] = useState('');
  const [costoBase, setCostoBase] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [stock, setStock] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEditing = !!productId;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error || updateMutation.error;

  const margin =
    costoBase && priceSale && Number(priceSale) > 0
      ? {
          amount: subtractMoney(priceSale, costoBase),
          pct: ((1 - Number(costoBase) / Number(priceSale)) * 100).toFixed(0),
        }
      : null;

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCostoBase(existing.costoBase);
      setPriceSale(existing.priceSale);
      setStock(String(existing.stock));
    }
  }, [existing]);

  function clearFieldError(field: string) {
    setFieldErrors((p) => ({ ...p, [field]: '' }));
  }

  async function handleSubmit(e: FormEvent, imageRef: RefObject<ImageUploadRef | null>) {
    e.preventDefault();
    if (!user) return;

    const candidate = {
      name: name.trim(),
      costoBase,
      priceSale,
      stock: Number(stock),
      imageUrl: null,
    };

    const schema = isEditing ? UpdateProductInputSchema : CreateProductInputSchema;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const imageUrl = (await imageRef.current?.upload(user.id, productId)) ?? null;
    const data = { ...candidate, imageUrl };

    if (isEditing && productId) {
      await updateMutation.mutateAsync({ id: productId, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    goBack();
  }

  async function handleDelete() {
    if (!productId) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    await deleteMutation.mutateAsync(productId);
    goBack();
  }

  return {
    // navigation
    goBack,
    // field values
    name,
    costoBase,
    priceSale,
    stock,
    fieldErrors,
    // field setters (clear their own error on change)
    setName: (v: string) => {
      setName(v);
      clearFieldError('name');
    },
    setCostoBase: (v: string) => {
      setCostoBase(v);
      clearFieldError('costoBase');
    },
    setPriceSale: (v: string) => {
      setPriceSale(v);
      clearFieldError('priceSale');
    },
    setStock: (v: string) => {
      setStock(v);
      clearFieldError('stock');
    },
    // derived
    isEditing,
    isLoading,
    isSaving,
    saveError,
    existing,
    margin,
    deleteConfirm,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error
      ? deleteMutation.error.message.includes('PRODUCT_HAS_SALES')
        ? 'No se puede eliminar un producto con ventas registradas.'
        : `Error: ${deleteMutation.error.message}`
      : null,
    // actions
    handleSubmit,
    handleDelete,
  };
}
