// Quick Sale — the "Modo Zen" 3-tap sale flow.
//
// 1. Tap a product → adds 1 to cart (tap again → increment)
// 2. Select payment method (Efectivo / Transferencia)
// 3. Tap "Vender $XXX" → done
//
// The cart is local state. Product prices come from the server-side
// list — but the actual price used in the sale is the server snapshot
// (see QuickSaleUseCase). The client just sends productId + quantity.

import type { MetodoPago, Product } from '@craftly/shared';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from '../../shared/lib/router';
import { useProducts } from '../products/api';
import { usePendingSales, useQuickSale } from './api';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export function QuickSale() {
  const { navigate } = useRouter();
  const { data: products, isLoading } = useProducts();
  const saleMutation = useQuickSale();

  const pendingCount = usePendingSales();

  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      const currentQty = existing?.quantity ?? 0;
      const maxStock = product.stock - currentQty;

      if (maxStock <= 0) return prev;

      next.set(product.id, {
        productId: product.id,
        name: product.name,
        price: Number(product.priceSale),
        quantity: currentQty + 1,
        maxStock: product.stock,
      });
      return next;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(productId);
      } else {
        next.set(productId, { ...existing, quantity: existing.quantity - 1 });
      }
      return next;
    });
  }, []);

  const cartItems = useMemo(() => [...cart.values()], [cart]);
  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  async function handleSell() {
    if (cartItems.length === 0) return;

    const result = await saleMutation.mutateAsync({
      metodoPago,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    setCart(new Map());
    navigate({ name: 'sale-success', total: result.total });
  }

  // Available products = those with stock > 0
  const available = products?.filter((p) => p.stock > 0) ?? [];
  const outOfStock = products?.filter((p) => p.stock === 0) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-48">
        {pendingCount > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-sm text-amber-800 font-medium">
              {pendingCount} {pendingCount === 1 ? 'venta pendiente' : 'ventas pendientes'} de
              sincronizar
            </span>
          </div>
        )}

        {isLoading && <div className="text-center py-12 text-stone-400">Cargando...</div>}

        {products && available.length === 0 && outOfStock.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-400 text-lg">No tenés productos</p>
            <p className="text-stone-400 text-sm mt-1">Crealos desde la pestaña Productos</p>
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
                    ${inCart ? 'ring-2 ring-craft-500 bg-craft-50' : ''}
                    ${remainingStock <= 0 ? 'opacity-50' : ''}`}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-16 object-cover rounded-lg mb-1.5"
                    />
                  ) : (
                    <div className="w-full h-16 rounded-lg bg-stone-100 flex items-center justify-center mb-1.5">
                      <span className="text-stone-300 text-xl font-bold">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="font-semibold text-stone-900 text-sm truncate">{product.name}</p>
                  <p className="text-craft-700 font-bold mt-1">${product.priceSale}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{remainingStock} disponibles</p>

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
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
              Sin stock
            </p>
            <div className="grid grid-cols-2 gap-3 opacity-40">
              {outOfStock.map((product) => (
                <div key={product.id} className="card">
                  <p className="font-semibold text-stone-900 text-sm truncate">{product.name}</p>
                  <p className="text-stone-400 font-bold mt-1">${product.priceSale}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart panel — fixed at bottom */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-stone-200 shadow-lg px-5 py-4 space-y-3">
          {/* Cart items summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-600">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              {cartItems.map((item) => (
                <button
                  key={item.productId}
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100
                             text-xs text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title={`Quitar 1 ${item.name}`}
                >
                  {item.name.slice(0, 8)}
                  {item.quantity > 1 && <span>×{item.quantity}</span>}
                  <span className="text-stone-400">×</span>
                </button>
              ))}
            </div>
            <span className="text-lg font-bold text-stone-900">${total.toFixed(2)}</span>
          </div>

          {/* Payment method toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago('EFECTIVO')}
              className={`flex-1 min-h-touch rounded-xl text-sm font-semibold transition-colors ${
                metodoPago === 'EFECTIVO'
                  ? 'bg-craft-600 text-white'
                  : 'bg-stone-100 text-stone-600'
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
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Transferencia
            </button>
          </div>

          {/* Sell button */}
          <button
            type="button"
            disabled={saleMutation.isPending}
            onClick={handleSell}
            className="btn-primary w-full text-lg"
          >
            {saleMutation.isPending ? 'Registrando...' : `Vender $${total.toFixed(2)}`}
          </button>

          {saleMutation.error && (
            <p className="text-red-600 text-sm text-center">
              {saleMutation.error.message.includes('INSUFFICIENT_STOCK')
                ? 'Stock insuficiente — alguien vendió antes que vos'
                : `Error: ${saleMutation.error.message}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
