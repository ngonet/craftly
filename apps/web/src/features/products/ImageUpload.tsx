// Product image upload — preview, compress, upload to Supabase Storage.
//
// Flow:
//   1. User taps the area (or the existing image) → file picker opens
//   2. Selected file → instant local preview (URL.createObjectURL)
//   3. Parent calls ref.upload() on form submit → compress → upload → URL
//
// The upload is NOT automatic on selection. The parent triggers it via
// the forwarded ref. This avoids orphan uploads if the user cancels.

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { PhotoIcon } from '../../shared/ui/icons';
import { useImageUpload } from './useImageUpload';

// ── Types ──────────────────────────────────────────────────

export interface ImageUploadRef {
  /** Upload the staged file. Returns the public URL, or currentUrl if no file staged. */
  upload: (userId: string, productId?: string) => Promise<string | null>;
}

interface ImageUploadProps {
  /** Existing image URL (edit mode). */
  currentUrl?: string | null;
}

// ── Component ──────────────────────────────────────────────

export const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(function ImageUpload(
  { currentUrl },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { preview, isUploading, error, upload, handleFileSelect, handleRemove } = useImageUpload({
    currentUrl,
  });

  useImperativeHandle(ref, () => ({ upload }), [upload]);

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed border-subtle hover:border-craft-400
                   transition-colors overflow-hidden bg-surface-muted min-h-[120px] flex items-center justify-center"
      >
        {preview ? (
          <img src={preview} alt="Preview del producto" className="w-full h-32 object-cover" />
        ) : (
          <div className="text-center py-6 px-4">
            <PhotoIcon className="w-8 h-8 text-fg-muted mx-auto mb-2" aria-label="Subir imagen" />
            <p className="text-sm text-fg-secondary">Tocá para agregar foto</p>
            <p className="text-xs text-fg-muted mt-0.5">Se comprime automáticamente</p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {isUploading && (
        <p className="text-xs text-craft-600 mt-1 animate-pulse">Subiendo imagen...</p>
      )}

      {error && <p className="text-xs text-danger-fg mt-1">{error}</p>}

      {preview && !isUploading && (
        <button
          type="button"
          onClick={() => handleRemove(inputRef)}
          className="text-xs text-danger-fg hover:text-danger-fg-strong mt-1"
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
});
