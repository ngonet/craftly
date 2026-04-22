import type { MetodoPago, Product } from '@craftly/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { multiplyMoney, sumMoney } from '../../shared/lib/money';
import { useRouter } from '../../shared/lib/router';
import { useQuickSale } from './api';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

const CART_KEY = 'craftly:cart';
const METODO_KEY = 'craftly:cart-metodo';

function loadCart(): Map<string, CartItem> {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [string, CartItem][]);
  } catch (err) {
    // Corrupt sessionStorage — degrade to empty cart rather than crashing mid-sale.
    console.warn('loadCart: failed to parse persisted cart, starting fresh', err);
    return new Map();
  }
}

function loadMetodo(): MetodoPago {
  return sessionStorage.getItem(METODO_KEY) === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO';
}

export function useQuickSaleCart() {
  const { navigate } = useRouter();
  const saleMutation = useQuickSale();

  const [cart, setCart] = useState<Map<string, CartItem>>(loadCart);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(loadMetodo);

  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify([...cart.entries()]));
  }, [cart]);

  useEffect(() => {
    sessionStorage.setItem(METODO_KEY, metodoPago);
  }, [metodoPago]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id);
      const currentQty = existing?.quantity ?? 0;
      if (product.stock - currentQty <= 0) return prev;
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
    () => sumMoney(cartItems.map((item) => multiplyMoney(item.price, item.quantity))),
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
      items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
    setCart(new Map());
    sessionStorage.removeItem(CART_KEY);
    sessionStorage.removeItem(METODO_KEY);
    navigate({ name: 'sale-success', total: result.total });
  }

  return {
    cart,
    cartItems,
    total,
    itemCount,
    metodoPago,
    setMetodoPago,
    addToCart,
    removeFromCart,
    handleSell,
    isSelling: saleMutation.isPending,
    sellError: saleMutation.error
      ? saleMutation.error.message.includes('INSUFFICIENT_STOCK')
        ? 'Stock insuficiente — alguien vendió antes que vos'
        : `Error: ${saleMutation.error.message}`
      : null,
  };
}
