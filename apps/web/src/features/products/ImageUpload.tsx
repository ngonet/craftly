// Product image upload — preview, compress, upload to Supabase Storage.
//
// Flow:
//   1. User taps the area (or the existing image) → file picker opens
//   2. Selected file → instant local preview (URL.createObjectURL)
//   3. Parent calls ref.upload() on form submit → compress → upload → URL
//
// The upload is NOT automatic on selection. The parent triggers it via
// the forwarded ref. This avoids orphan uploads if the user cancels.

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { compressImage } from '../../shared/lib/image';
import { supabase } from '../../shared/lib/supabase';

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
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stagedFile = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (userId: string, productId?: string): Promise<string | null> => {
      if (!stagedFile.current) return currentUrl ?? null;

      setIsUploading(true);
      setError(null);

      try {
        const { blob } = await compressImage(stagedFile.current);

        // Path: {userId}/{productId|timestamp}.jpg
        // upsert: true overwrites on edit, timestamp avoids collisions on create.
        const fileName = productId ? `${productId}.jpg` : `${Date.now()}.jpg`;
        const path = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('products').upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);

        stagedFile.current = null;
        return urlData.publicUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al subir imagen';
        setError(msg);
        return currentUrl ?? null;
      } finally {
        setIsUploading(false);
      }
    },
    [currentUrl],
  );

  useImperativeHandle(ref, () => ({ upload }), [upload]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es muy grande (máx 10MB)');
      return;
    }

    setError(null);
    stagedFile.current = file;

    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function handleRemove() {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(null);
    stagedFile.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }

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
            <svg
              className="w-8 h-8 text-fg-muted mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              role="img"
              aria-label="Subir imagen"
            >
              <title>Subir imagen</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm14.25-13.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
              />
            </svg>
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
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading && (
        <p className="text-xs text-craft-600 mt-1 animate-pulse">Subiendo imagen...</p>
      )}

      {error && <p className="text-xs text-danger-fg mt-1">{error}</p>}

      {preview && !isUploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="text-xs text-danger-fg hover:text-danger-fg-strong mt-1"
        >
          Quitar imagen
        </button>
      )}
    </div>
  );
});
