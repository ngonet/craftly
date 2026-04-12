// Product contract — shared between API and Web.
//
// Three schemas:
//   ProductSchema            → full shape as returned by the API
//   CreateProductInputSchema → POST /products body
//   UpdateProductInputSchema → PATCH /products/:id body (all fields optional)
//
// Types are derived via z.infer — single source of truth.

import { z } from 'zod';
import { Iso8601, Money, NonNegativeInt, Uuid } from './common.js';

const ProductName = z.string().trim().min(1, 'requerido').max(120);
const ImageUrl = z.string().url().max(2048);

export const ProductSchema = z.object({
  id: Uuid,
  userId: Uuid,
  name: ProductName,
  costoBase: Money,
  priceSale: Money,
  stock: NonNegativeInt,
  imageUrl: ImageUrl.nullable(),
  createdAt: Iso8601,
  updatedAt: Iso8601,
});

export const CreateProductInputSchema = z.object({
  name: ProductName,
  costoBase: Money,
  priceSale: Money,
  stock: NonNegativeInt.default(0),
  imageUrl: ImageUrl.nullish(),
});

export const UpdateProductInputSchema = CreateProductInputSchema.partial();

export type Product = z.infer<typeof ProductSchema>;
export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;
