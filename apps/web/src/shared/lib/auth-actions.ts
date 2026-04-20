import { useCallback } from 'react';

import { supabase } from './supabase';

interface MagicLinkLoginResult {
  errorMessage: string | null;
  successMessage: string | null;
}

function getAuthRedirectUrl(): string {
  return import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin;
}

export function useAuthActions() {
  const loginWithMagicLink = useCallback(
    async (emailEntry: FormDataEntryValue | null): Promise<MagicLinkLoginResult> => {
      if (typeof emailEntry !== 'string' || emailEntry.length === 0) {
        return {
          errorMessage: 'Ingresá un email válido para recibir el link mágico.',
          successMessage: null,
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: emailEntry,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) {
        return {
          errorMessage: `No pudimos enviarte el link mágico: ${error.message}`,
          successMessage: null,
        };
      }

      return {
        errorMessage: null,
        successMessage: 'Revisá tu email — te enviamos un link mágico para entrar.',
      };
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`No pudimos cerrar la sesión: ${error.message}`);
    }
  }, []);

  return {
    loginWithMagicLink,
    logout,
  };
}
