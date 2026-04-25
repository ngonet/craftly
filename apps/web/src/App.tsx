// App shell — routes between auth states and feature screens.
//
// Three auth states: loading, unauthenticated (login), authenticated.
// Once authenticated, the router context handles screen navigation
// with a bottom tab bar (Productos | Vender).

import type { FormEvent } from 'react';
import { useState } from 'react';

import { ProductForm } from './features/products/ProductForm';
import { ProductList } from './features/products/ProductList';
import { DailySummary } from './features/sales/DailySummary';
import { QuickSale } from './features/sales/QuickSale';
import { SaleSuccess } from './features/sales/SaleSuccess';
import { useAuth } from './shared/lib/auth';
import { useAuthActions } from './shared/lib/auth-actions';
import { useDisplaySettings } from './shared/lib/display-settings';
import { useRouter } from './shared/lib/router';
import { BottomNav } from './shared/ui/BottomNav';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-craft-700">Craftly</h1>
        <p className="mt-2 text-fg-secondary">Cargando...</p>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'error' | 'success' | null>(null);
  const { loginWithMagicLink } = useAuthActions();

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { errorMessage, successMessage } = await loginWithMagicLink(form.get('email'));

    setFeedbackMessage(null);
    setFeedbackTone(null);

    if (errorMessage) {
      setFeedbackTone('error');
      setFeedbackMessage(errorMessage);
      return;
    }

    setFeedbackTone('success');
    setFeedbackMessage(successMessage);
  }

  return (
    <div className="flex items-center justify-center min-h-dvh px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-craft-700">Craftly</h1>
          <p className="mt-2 text-fg-secondary text-lg">Tu inventario de feria, simple.</p>
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
              feedbackTone === 'error' ? 'text-danger-fg' : 'text-success-fg'
            }`}
          >
            {feedbackMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-fg-muted">
          Te enviamos un link mágico. Sin contraseñas.
        </p>
      </div>
    </div>
  );
}

function ScreenFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <p className="text-fg-primary font-semibold">Algo falló en esta pantalla</p>
      <p className="text-fg-muted text-sm mt-1 max-w-xs">{error.message}</p>
      <button type="button" onClick={reset} className="btn-ghost mt-4 text-sm">
        Reintentar
      </button>
    </div>
  );
}

function CurrentScreen() {
  const { screen } = useRouter();

  return (
    <ErrorBoundary key={screen.name} fallback={ScreenFallback}>
      {(() => {
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
      })()}
    </ErrorBoundary>
  );
}

function MainScreen() {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const {
    theme,
    canDecreaseSmallText,
    canIncreaseSmallText,
    decreaseSmallText,
    increaseSmallText,
    toggleTheme,
  } = useDisplaySettings();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-dvh flex flex-col pb-16">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-subtle">
        <div>
          <h1 className="text-xl font-bold text-craft-700">Craftly</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="inline-flex items-center rounded-xl border border-subtle bg-surface-card p-1">
            <button
              type="button"
              onClick={decreaseSmallText}
              disabled={!canDecreaseSmallText}
              aria-label="Reducir fuentes pequeñas"
              className={
                'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm ' +
                'font-semibold text-fg-primary transition-colors hover:bg-surface-muted ' +
                'disabled:text-fg-muted disabled:hover:bg-transparent'
              }
            >
              -
            </button>
            <span className="px-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Aa
            </span>
            <button
              type="button"
              onClick={increaseSmallText}
              disabled={!canIncreaseSmallText}
              aria-label="Aumentar fuentes pequeñas"
              className={
                'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm ' +
                'font-semibold text-fg-primary transition-colors hover:bg-surface-muted ' +
                'disabled:text-fg-muted disabled:hover:bg-transparent'
              }
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="btn-ghost min-w-touch px-3 text-sm"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="text-sm text-fg-muted hidden sm:inline">{user?.email}</span>
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
