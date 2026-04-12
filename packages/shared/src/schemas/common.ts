// Primitive Zod schemas shared across all contracts.
//
// The key decision here is MONEY. We NEVER use floats for currency on the
// wire — IEEE-754 drift (0.1 + 0.2 !== 0.3) silently corrupts totals.
// Money is always a string on the wire (e.g. "1250.00"), matching what
// Prisma's Decimal serializes to. Inputs can be number OR string; the
// schema normalizes to a string with exactly 2 decimal places.

import { z } from 'zod';

export const Uuid = z.string().uuid();

export const Iso8601 = z.string().datetime();

export const PositiveInt = z.number().int().positive();

export const NonNegativeInt = z.number().int().nonnegative();

/**
 * Money — string on the wire (e.g. "1250.00").
 * Accepts a compatible string OR a non-negative finite number.
 * Output is always a string with exactly 2 decimal places.
 */
export const Money = z
  .union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'formato inválido (ej: "1250.00")'),
    z.number().nonnegative().finite(),
  ])
  .transform((v) => (typeof v === 'string' ? Number(v).toFixed(2) : v.toFixed(2)));
