// Sale success — confirmation screen after a quick sale.
//
// Shows the total and lets the artisan go back to sell more
// or switch to the products tab.

import { useRouter } from '../../shared/lib/router';

export function SaleSuccess({ total }: { total: string }) {
  const { setTab } = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-success-strong flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-success-fg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          role="img"
          aria-label="Venta registrada"
        >
          <title>Venta registrada</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-fg-primary">Venta registrada</h2>
      <p className="text-4xl font-bold text-craft-700 mt-3">${total}</p>

      <div className="mt-8 space-y-3 w-full max-w-xs">
        <button type="button" className="btn-primary w-full" onClick={() => setTab('quick-sale')}>
          Nueva venta
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => setTab('products')}>
          Ver productos
        </button>
      </div>
    </div>
  );
}
