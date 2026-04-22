// Integer-cent arithmetic for client-side money calculations.
//
// IEEE-754 floats accumulate error on repeated multiplication/addition.
// Example: 1299.99 * 3 = 3899.9699999999998 instead of 3900.00.
// Fix: convert to integer cents, do arithmetic, convert back to string.

function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Multiply a money value by an integer quantity. */
export function multiplyMoney(price: string | number, qty: number): string {
  return fromCents(toCents(price) * qty);
}

/** Sum an array of money values. */
export function sumMoney(values: (string | number)[]): string {
  return fromCents(values.reduce<number>((acc, v) => acc + toCents(v), 0));
}

/** Subtract two money values (a - b). */
export function subtractMoney(a: string | number, b: string | number): string {
  return fromCents(toCents(a) - toCents(b));
}
