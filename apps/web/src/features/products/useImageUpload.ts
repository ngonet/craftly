import { useCallback, useRef, useState } from 'react';
import { compressImage } from '../../shared/lib/image';
import { supabase } from '../../shared/lib/supabase';

interface UseImageUploadOptions {
  currentUrl?: string | null;
}

export function useImageUpload({ currentUrl }: UseImageUploadOptions) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stagedFile = useRef<File | null>(null);

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

  function handleFileSelect(file: File) {
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

  function handleRemove(inputRef: React.RefObject<HTMLInputElement | null>) {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(null);
    stagedFile.current = null;
    if (inputRef.current) inputRef.current.value = '';
  }

  return { preview, isUploading, error, upload, handleFileSelect, handleRemove };
}
