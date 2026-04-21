// Product form — create or edit a product.
//
// When productId is provided, loads the existing product and shows
// a delete button. Otherwise, it's a clean creation form.
//
// Image upload: the ImageUpload component stages a file locally.
// On form submit, we call imageHandle.upload() which compresses and
// uploads to Supabase Storage, then we pass the URL to the API.

import { useRef } from 'react';
import { ImageUpload, type ImageUploadRef } from './ImageUpload';
import { useProductForm } from './useProductForm';

export function ProductForm({ productId }: { productId?: string }) {
  const imageRef = useRef<ImageUploadRef>(null);
  const {
    goBack,
    name,
    setName,
    costoBase,
    setCostoBase,
    priceSale,
    setPriceSale,
    stock,
    setStock,
    fieldErrors,
    isEditing,
    isLoading,
    isSaving,
    saveError,
    existing,
    margin,
    deleteConfirm,
    isDeleting,
    deleteError,
    handleSubmit,
    handleDelete,
  } = useProductForm({ productId });

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-fg-muted">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-subtle">
        <button
          type="button"
          onClick={goBack}
          className="btn-ghost text-sm px-3"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <h2 className="text-lg font-bold text-fg-primary">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h2>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => handleSubmit(e, imageRef)}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
      >
        {/* Image upload */}
        <div>
          <span className="block text-sm font-medium text-fg-secondary mb-1">
            Foto del producto
          </span>
          <ImageUpload ref={imageRef} currentUrl={existing?.imageUrl} />
        </div>

        <div>
          <label htmlFor="pf-name" className="block text-sm font-medium text-fg-secondary mb-1">
            Nombre
          </label>
          <input
            id="pf-name"
            type="text"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vela aromática lavanda"
            className="input"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-danger-fg">{fieldErrors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pf-costo" className="block text-sm font-medium text-fg-secondary mb-1">
              Costo base ($)
            </label>
            <input
              id="pf-costo"
              type="number"
              min="0"
              step="0.01"
              value={costoBase}
              onChange={(e) => setCostoBase(e.target.value)}
              placeholder="0.00"
              className="input"
              inputMode="decimal"
            />
            {fieldErrors.costoBase && (
              <p className="mt-1 text-xs text-danger-fg">{fieldErrors.costoBase}</p>
            )}
          </div>
          <div>
            <label htmlFor="pf-price" className="block text-sm font-medium text-fg-secondary mb-1">
              Precio venta ($)
            </label>
            <input
              id="pf-price"
              type="number"
              min="0"
              step="0.01"
              value={priceSale}
              onChange={(e) => setPriceSale(e.target.value)}
              placeholder="0.00"
              className="input"
              inputMode="decimal"
            />
            {fieldErrors.priceSale && (
              <p className="mt-1 text-xs text-danger-fg">{fieldErrors.priceSale}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="pf-stock" className="block text-sm font-medium text-fg-secondary mb-1">
            Stock inicial
          </label>
          <input
            id="pf-stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
            className="input"
            inputMode="numeric"
          />
          {fieldErrors.stock && <p className="mt-1 text-xs text-danger-fg">{fieldErrors.stock}</p>}
        </div>

        {/* Margin preview */}
        {margin && (
          <div className="card bg-surface-muted">
            <p className="text-sm text-fg-secondary">
              Margen: <span className="font-semibold text-craft-700">${margin.amount}</span> por
              unidad ({margin.pct}%)
            </p>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded-xl bg-danger-soft text-danger-fg text-sm">
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
            disabled={isDeleting}
            onClick={handleDelete}
            className={`btn w-full ${
              deleteConfirm
                ? 'bg-danger-fg text-white hover:bg-danger-fg-strong'
                : 'bg-transparent text-danger-fg hover:bg-danger-soft'
            }`}
          >
            {isDeleting
              ? 'Eliminando...'
              : deleteConfirm
                ? 'Confirmar eliminación'
                : 'Eliminar producto'}
          </button>
        )}

        {deleteError && (
          <div className="p-3 rounded-xl bg-danger-soft text-danger-fg text-sm">{deleteError}</div>
        )}
      </form>
    </div>
  );
}
