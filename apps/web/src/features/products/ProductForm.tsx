// Product form — create or edit a product.
//
// When productId is provided, loads the existing product and shows
// a delete button. Otherwise, it's a clean creation form.
//
// Image upload: the ImageUpload component stages a file locally.
// On form submit, we call imageHandle.upload() which compresses and
// uploads to Supabase Storage, then we pass the URL to the API.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../shared/lib/auth';
import { useRouter } from '../../shared/lib/router';
import { ImageUpload, type ImageUploadRef } from './ImageUpload';
import { useCreateProduct, useDeleteProduct, useProduct, useUpdateProduct } from './api';

export function ProductForm({ productId }: { productId?: string }) {
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

  const imageRef = useRef<ImageUploadRef>(null);

  const isEditing = !!productId;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error || updateMutation.error;

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCostoBase(existing.costoBase);
      setPriceSale(existing.priceSale);
      setStock(String(existing.stock));
    }
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Upload image first (no-op if no file staged).
    const imageUrl = (await imageRef.current?.upload(user.id, productId)) ?? null;

    const data = {
      name: name.trim(),
      costoBase,
      priceSale,
      stock: Number(stock),
      imageUrl,
    };

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

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-stone-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-200">
        <button
          type="button"
          onClick={goBack}
          className="btn-ghost text-sm px-3"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <h2 className="text-lg font-bold text-stone-900">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Image upload */}
        <div>
          <span className="block text-sm font-medium text-stone-700 mb-1">Foto del producto</span>
          <ImageUpload ref={imageRef} currentUrl={existing?.imageUrl} />
        </div>

        <div>
          <label htmlFor="pf-name" className="block text-sm font-medium text-stone-700 mb-1">
            Nombre
          </label>
          <input
            id="pf-name"
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vela aromática lavanda"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pf-costo" className="block text-sm font-medium text-stone-700 mb-1">
              Costo base ($)
            </label>
            <input
              id="pf-costo"
              type="number"
              required
              min="0"
              step="0.01"
              value={costoBase}
              onChange={(e) => setCostoBase(e.target.value)}
              placeholder="0.00"
              className="input"
              inputMode="decimal"
            />
          </div>
          <div>
            <label htmlFor="pf-price" className="block text-sm font-medium text-stone-700 mb-1">
              Precio venta ($)
            </label>
            <input
              id="pf-price"
              type="number"
              required
              min="0"
              step="0.01"
              value={priceSale}
              onChange={(e) => setPriceSale(e.target.value)}
              placeholder="0.00"
              className="input"
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pf-stock" className="block text-sm font-medium text-stone-700 mb-1">
            Stock inicial
          </label>
          <input
            id="pf-stock"
            type="number"
            required
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
            className="input"
            inputMode="numeric"
          />
        </div>

        {/* Margin preview */}
        {costoBase && priceSale && Number(priceSale) > 0 && (
          <div className="card bg-stone-50">
            <p className="text-sm text-stone-600">
              Margen:{' '}
              <span className="font-semibold text-craft-700">
                ${(Number(priceSale) - Number(costoBase)).toFixed(2)}
              </span>{' '}
              por unidad ({((1 - Number(costoBase) / Number(priceSale)) * 100).toFixed(0)}%)
            </p>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            Error al guardar: {saveError.message}
          </div>
        )}

        <button type="submit" disabled={isSaving} className="btn-primary w-full">
          {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>

        {/* Delete */}
        {isEditing && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            className={`btn w-full ${
              deleteConfirm
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-transparent text-red-600 hover:bg-red-50'
            }`}
          >
            {deleteMutation.isPending
              ? 'Eliminando...'
              : deleteConfirm
                ? 'Confirmar eliminación'
                : 'Eliminar producto'}
          </button>
        )}

        {deleteMutation.error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            {deleteMutation.error.message.includes('PRODUCT_HAS_SALES')
              ? 'No se puede eliminar un producto con ventas registradas.'
              : `Error: ${deleteMutation.error.message}`}
          </div>
        )}
      </form>
    </div>
  );
}
