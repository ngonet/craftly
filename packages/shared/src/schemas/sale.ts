// Sale contracts — shared between API and Web.
//
// QuickSaleInputSchema is the body for POST /api/sales/quick — the
// "3-tap sale" flow. It ONLY carries productId + quantity per line;
// the API looks up the current priceSale and stores a snapshot.
// Clients NEVER set prices on the wire — that would let a malicious
// client rewrite history.

import { z } from 'zod';
import { Iso8601, Money, PositiveInt, Uuid } from './common.js';

export const MetodoPagoSchema = z.enum(['EFECTIVO', 'TRANSFERENCIA']);
export type MetodoPago = z.infer<typeof MetodoPagoSchema>;

// ── Input ──────────────────────────────────────────────────

export const QuickSaleItemInputSchema = z.object({
  productId: Uuid,
  quantity: PositiveInt,
});

export const QuickSaleInputSchema = z.object({
  metodoPago: MetodoPagoSchema,
  items: z.array(QuickSaleItemInputSchema).min(1, 'al menos un item'),
});

export type QuickSaleItemInput = z.infer<typeof QuickSaleItemInputSchema>;
export type QuickSaleInput = z.infer<typeof QuickSaleInputSchema>;

// ── Output ─────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  id: Uuid,
  saleId: Uuid,
  productId: Uuid,
  quantity: PositiveInt,
  unitPrice: Money,
  subtotal: Money,
});

export const SaleSchema = z.object({
  id: Uuid,
  userId: Uuid,
  metodoPago: MetodoPagoSchema,
  total: Money,
  createdAt: Iso8601,
  items: z.array(SaleItemSchema),
});

export type SaleItemDto = z.infer<typeof SaleItemSchema>;
export type SaleDto = z.infer<typeof SaleSchema>;
