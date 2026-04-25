// Quick Sale — the "Modo Zen" 3-tap sale flow.
//
// 1. Tap a product → adds 1 to cart (tap again → increment)
// 2. Select payment method (Efectivo / Transferencia)
// 3. Tap "Vender $XXX" → done
//
// The cart is local state. Product prices come from the server-side
// list — but the actual price used in the sale is the server snapshot
// (see QuickSaleUseCase). The client just sends productId + quantity.

import { useState } from 'react';
import { useProducts } from '../products/api';
import { usePendingSales } from './api';
import { useQuickSaleCart } from './useQuickSaleCart';

export function QuickSale() {
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProducts(search || undefined);
  const pendingCount = usePendingSales();
  const {
    cart,
    cartItems,
    total,
    itemCount,
    metodoPago,
    setMetodoPago,
    addToCart,
    removeFromCart,
    handleSell,
    isSelling,
    sellError,
  } = useQuickSaleCart();

  const available = products?.filter((p) => p.stock > 0) ?? [];
  const outOfStock = products?.filter((p) => p.stock === 0) ?? [];

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

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-48">
        {pendingCount > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-accent-soft border border-accent flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-fg opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-fg" />
            </span>
            <span className="text-sm text-accent-fg font-medium">
              {pendingCount} {pendingCount === 1 ? 'venta pendiente' : 'ventas pendientes'} de
              sincronizar
            </span>
          </div>
        )}

        {isLoading && <div className="text-center py-12 text-fg-muted">Cargando...</div>}

        {products && available.length === 0 && outOfStock.length === 0 && (
          <div className="text-center py-12">
            <p className="text-fg-muted text-lg">No tenés productos</p>
            <p className="text-fg-muted text-sm mt-1">Crealos desde la pestaña Productos</p>
          </div>
        )}

        {available.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {available.map((product) => {
              const inCart = cart.get(product.id);
              const remainingStock = product.stock - (inCart?.quantity ?? 0);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={remainingStock <= 0}
                  onClick={() => addToCart(product)}
                  className={`card text-left active:scale-[0.96] transition-all relative
                    ${inCart ? 'ring-2 ring-craft-500 bg-accent-soft' : ''}
                    ${remainingStock <= 0 ? 'opacity-50' : ''}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-16 object-cover rounded-lg mb-1.5"
                    />
                  ) : (
                    <div className="w-full h-16 rounded-lg bg-surface-muted flex items-center justify-center mb-1.5">
                      <span className="text-fg-muted text-xl font-bold">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="font-semibold text-fg-primary text-sm truncate">{product.name}</p>
                  <p className="text-craft-700 font-bold mt-1">${product.priceSale}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{remainingStock} disponibles</p>

                  {inCart && (
                    <span
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-craft-600 text-white
                                     text-xs font-bold flex items-center justify-center shadow"
                    >
                      {inCart.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {outOfStock.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2">
              Sin stock
            </p>
            <div className="grid grid-cols-2 gap-3 opacity-40">
              {outOfStock.map((product) => (
                <div key={product.id} className="card">
                  <p className="font-semibold text-fg-primary text-sm truncate">{product.name}</p>
                  <p className="text-fg-muted font-bold mt-1">${product.priceSale}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart panel — fixed at bottom */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-surface-card border-t border-subtle shadow-lg px-5 py-4 space-y-3">
          {/* Cart items summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-secondary">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              {cartItems.map((item) => (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted
                             text-xs text-fg-secondary hover:bg-danger-soft hover:text-danger-fg transition-colors"
                  title={`Quitar 1 ${item.name}`}
                >
                  {item.name.slice(0, 8)}
                  {item.quantity > 1 && <span>×{item.quantity}</span>}
                  <span className="text-fg-muted">×</span>
                </button>
              ))}
            </div>
            <span className="text-lg font-bold text-fg-primary">${total}</span>
          </div>

          {/* Payment method toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago('EFECTIVO')}
              className={`flex-1 min-h-touch rounded-xl text-sm font-semibold transition-colors ${
                metodoPago === 'EFECTIVO'
                  ? 'bg-craft-600 text-white'
                  : 'bg-surface-muted text-fg-secondary'
              }`}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setMetodoPago('TRANSFERENCIA')}
              className={`flex-1 min-h-touch rounded-xl text-sm font-semibold transition-colors ${
                metodoPago === 'TRANSFERENCIA'
                  ? 'bg-craft-600 text-white'
                  : 'bg-surface-muted text-fg-secondary'
              }`}
            >
              Transferencia
            </button>
          </div>

          {/* Sell button */}
          <button
            type="button"
            disabled={isSelling}
            onClick={handleSell}
            className="btn-primary w-full text-lg"
          >
            {isSelling ? 'Registrando...' : `Vender $${total}`}
          </button>

          {sellError && <p className="text-danger-fg text-sm text-center">{sellError}</p>}
        </div>
      )}
    </div>
  );
}
