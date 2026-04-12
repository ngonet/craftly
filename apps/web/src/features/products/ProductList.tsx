// Product list — main screen for the "Productos" tab.
//
// Shows a searchable list of the artisan's products with stock indicators.
// Tap a product card → edit form. FAB → create form.

import { useState } from 'react';
import { useProducts } from './api';
import { useRouter } from '../../shared/lib/router';

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
        Sin stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
        {stock} uds
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
      {stock} uds
    </span>
  );
}

export function ProductList() {
  const { navigate } = useRouter();
  const [search, setSearch] = useState('');
  const { data: products, isLoading, error } = useProducts(search || undefined);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-5 pt-4 pb-2">
        <input
          type="search"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {isLoading && (
          <div className="text-center py-12 text-stone-400">Cargando...</div>
        )}

        {error && (
          <div className="text-center py-12 text-red-600">
            Error al cargar productos
          </div>
        )}

        {products && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-400 text-lg">
              {search ? 'Sin resultados' : 'No tenés productos todavía'}
            </p>
            {!search && (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => navigate({ name: 'product-form' })}
              >
                Crear tu primer producto
              </button>
            )}
          </div>
        )}

        {products && products.length > 0 && (
          <ul className="space-y-3 pt-2">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="card w-full text-left active:scale-[0.98] transition-transform"
                  onClick={() =>
                    navigate({ name: 'product-form', productId: product.id })
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-stone-500 mt-0.5">
                        Costo ${product.costoBase} · Venta{' '}
                        <span className="font-semibold text-craft-700">
                          ${product.priceSale}
                        </span>
                      </p>
                    </div>
                    <StockBadge stock={product.stock} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB — Create product */}
      {products && products.length > 0 && (
        <button
          type="button"
          aria-label="Crear producto"
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-craft-600 text-white shadow-lg
                     flex items-center justify-center text-2xl font-bold
                     hover:bg-craft-700 active:bg-craft-800 active:scale-95 transition-all"
          onClick={() => navigate({ name: 'product-form' })}
        >
          +
        </button>
      )}
    </div>
  );
}
