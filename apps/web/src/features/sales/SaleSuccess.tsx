// Sale success — confirmation screen after a quick sale.
//
// Shows the total and lets the artisan go back to sell more
// or switch to the products tab.

import { useRouter } from '../../shared/lib/router';
import { CheckIcon } from '../../shared/ui/icons';

export function SaleSuccess({ total }: { total: string }) {
  const { setTab } = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-success-strong flex items-center justify-center mb-6">
        <CheckIcon
          className="w-10 h-10 text-success-fg"
          strokeWidth={2.5}
          aria-label="Venta registrada"
        />
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
