// App shell — routes between auth states and feature screens.
//
// Three auth states: loading, unauthenticated (login), authenticated.
// Once authenticated, the router context handles screen navigation
// with a bottom tab bar (Productos | Vender).

import { useState } from 'react';

import { ProductForm } from './features/products/ProductForm';
import { ProductList } from './features/products/ProductList';
import { DailySummary } from './features/sales/DailySummary';
import { QuickSale } from './features/sales/QuickSale';
import { SaleSuccess } from './features/sales/SaleSuccess';
import { useAuth } from './shared/lib/auth';
import { useRouter } from './shared/lib/router';
import { supabase } from './shared/lib/supabase';
import { BottomNav } from './shared/ui/BottomNav';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-craft-700">Craftly</h1>
        <p className="mt-2 text-stone-500">Cargando...</p>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'error' | 'success' | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailEntry = form.get('email');

    if (typeof emailEntry !== 'string' || emailEntry.length === 0) {
      setFeedbackTone('error');
      setFeedbackMessage('Ingresá un email válido para recibir el link mágico.');
      return;
    }

    const email = emailEntry;
    const emailRedirectTo =
      import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin;
    setFeedbackMessage(null);
    setFeedbackTone(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });
    if (error) {
      setFeedbackTone('error');
      setFeedbackMessage(`No pudimos enviarte el link mágico: ${error.message}`);
      return;
    }
    setFeedbackTone('success');
    setFeedbackMessage('Revisá tu email — te enviamos un link mágico para entrar.');
  }

  return (
    <div className="flex items-center justify-center min-h-dvh px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-craft-700">Craftly</h1>
          <p className="mt-2 text-stone-600 text-lg">Tu inventario de feria, simple.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            autoComplete="email"
            className="input"
          />
          <button type="submit" className="btn-primary w-full">
            Entrar con email
          </button>
        </form>

        {feedbackMessage ? (
          <p
            className={`mt-4 text-sm ${
              feedbackTone === 'error' ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {feedbackMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-stone-400">
          Te enviamos un link mágico. Sin contraseñas.
        </p>
      </div>
    </div>
  );
}

function CurrentScreen() {
  const { screen } = useRouter();

  switch (screen.name) {
    case 'products':
      return <ProductList />;
    case 'product-form':
      return <ProductForm productId={screen.productId} />;
    case 'quick-sale':
      return <QuickSale />;
    case 'sale-success':
      return <SaleSuccess total={screen.total} />;
    case 'daily-summary':
      return <DailySummary />;
  }
}

function MainScreen() {
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-dvh flex flex-col pb-16">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
        <h1 className="text-xl font-bold text-craft-700">Craftly</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-400 hidden sm:inline">{user?.email}</span>
          <button type="button" onClick={handleLogout} className="btn-ghost text-sm">
            Salir
          </button>
        </div>
      </header>

      {/* Screen content */}
      <main className="flex-1">
        <CurrentScreen />
      </main>

      {/* Tab bar */}
      <BottomNav />
    </div>
  );
}

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  return <MainScreen />;
}
