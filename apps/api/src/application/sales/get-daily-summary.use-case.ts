// ═══════════════════════════════════════════════════════════════
// GetDailySummaryUseCase — "Cierre de Caja"
//
// Returns today's sales aggregated for a single user:
//   - Total revenue, total cost, profit (utilidad)
//   - Breakdown by payment method (EFECTIVO / TRANSFERENCIA)
//   - The list of individual sales (most recent first, capped at 50)
//
// ── Timezone handling ────────────────────────────────────────
//
// The artisan's "today" depends on their timezone. A sale at 23:30
// Buenos Aires time is still "today" for them, but already "tomorrow"
// in UTC. We compute the UTC boundaries of "today" in the given tz
// and pass those to Postgres — this way the `[userId, createdAt DESC]`
// index is fully utilized.
//
// ── Cost calculation ─────────────────────────────────────────
//
// We need `costoBase` from products to compute profit. Instead of
// a second query, we join through SaleItem → Product in a single
// query. The unitPrice on SaleItem is the sale-time snapshot (revenue);
// Product.costoBase is the current cost (good enough for a daily
// summary — cost changes mid-day are extremely rare for artisans).
// ═══════════════════════════════════════════════════════════════

import type { MetodoPago } from '@craftly/shared';
import { Prisma, type PrismaClient } from '@prisma/client';

// ── Input ──────────────────────────────────────────────────

export interface DailySummaryInput {
  userId: string;
  /** IANA timezone, e.g. "America/Argentina/Buenos_Aires" */
  timezone: string;
}

// ── Output — plain objects, no Prisma types leak out ───────

export interface PaymentBreakdownOutput {
  metodoPago: MetodoPago;
  count: number;
  total: string; // Money as string "1250.00"
}

export interface DailySummaryOutput {
  date: string; // YYYY-MM-DD in the requested timezone
  salesCount: number;
  totalVentas: string;
  totalCosto: string;
  utilidad: string;
  byMetodoPago: PaymentBreakdownOutput[];
  sales: Array<{
    id: string;
    userId: string;
    metodoPago: MetodoPago;
    total: string;
    createdAt: string;
    items: Array<{
      id: string;
      saleId: string;
      productId: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }>;
  }>;
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Returns { start, end, dateStr } for "today" in the given IANA timezone.
 * Both boundaries are UTC Date objects so Prisma sends them correctly.
 */
function todayBoundsUtc(timezone: string): {
  start: Date;
  end: Date;
  dateStr: string;
} {
  // Get "now" in the target timezone as YYYY-MM-DD
  const nowInTz = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  // en-CA locale gives YYYY-MM-DD format

  // Build midnight boundaries in the target timezone, then convert to UTC.
  // Intl.DateTimeFormat gives us the UTC offset implicitly — but the
  // simplest portable approach: construct an ISO string with the tz and
  // let Date parse it. Node 18+ supports this via Temporal-like behavior,
  // but for max compat we use a manual approach.
  //
  // We format midnight in the target tz as an ISO-ish string, then parse
  // the offset to compute UTC. However, the SAFEST way is using
  // Intl.DateTimeFormat to extract parts.

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  // Extract the current offset string like "GMT-3" or "GMT+5:30"
  const offsetStr = get('timeZoneName'); // e.g. "GMT-3"
  const offsetMatch = offsetStr.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);

  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = Number(offsetMatch[2]);
    const mins = Number(offsetMatch[3] ?? '0');
    offsetMinutes = sign * (hours * 60 + mins);
  }

  // Midnight local = start of dateStr in UTC
  // If tz is GMT-3, midnight local = 03:00 UTC
  const startUtc = new Date(`${nowInTz}T00:00:00.000Z`);
  startUtc.setMinutes(startUtc.getMinutes() - offsetMinutes);

  const endUtc = new Date(startUtc);
  endUtc.setDate(endUtc.getDate() + 1);

  return { start: startUtc, end: endUtc, dateStr: nowInTz };
}

// ── Use case ───────────────────────────────────────────────

const SALES_LIMIT = 50;

export class GetDailySummaryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DailySummaryInput): Promise<DailySummaryOutput> {
    const { start, end, dateStr } = todayBoundsUtc(input.timezone);

    // Single query: sales with items AND the product's costoBase for profit calc.
    // The index on [userId, createdAt DESC] makes this efficient.
    const sales = await this.prisma.sale.findMany({
      where: {
        userId: input.userId,
        createdAt: { gte: start, lt: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: { costoBase: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: SALES_LIMIT,
    });

    // ── Aggregate ─────────────────────────────────────────
    let totalVentas = new Prisma.Decimal(0);
    let totalCosto = new Prisma.Decimal(0);

    const byMetodo = new Map<MetodoPago, { count: number; total: Prisma.Decimal }>();

    for (const sale of sales) {
      totalVentas = totalVentas.add(sale.total);

      // Payment method aggregation
      const entry = byMetodo.get(sale.metodoPago) ?? {
        count: 0,
        total: new Prisma.Decimal(0),
      };
      entry.count += 1;
      entry.total = entry.total.add(sale.total);
      byMetodo.set(sale.metodoPago, entry);

      // Cost aggregation from product.costoBase * quantity
      for (const item of sale.items) {
        const costPerUnit = item.product.costoBase;
        totalCosto = totalCosto.add(costPerUnit.mul(item.quantity));
      }
    }

    const utilidad = totalVentas.sub(totalCosto);

    // ── Shape output ──────────────────────────────────────
    const byMetodoPago: PaymentBreakdownOutput[] = (['EFECTIVO', 'TRANSFERENCIA'] as const).map(
      (mp) => {
        const entry = byMetodo.get(mp);
        return {
          metodoPago: mp,
          count: entry?.count ?? 0,
          total: (entry?.total ?? new Prisma.Decimal(0)).toFixed(2),
        };
      },
    );

    return {
      date: dateStr,
      salesCount: sales.length,
      totalVentas: totalVentas.toFixed(2),
      totalCosto: totalCosto.toFixed(2),
      utilidad: utilidad.toFixed(2),
      byMetodoPago,
      sales: sales.map((sale) => ({
        id: sale.id,
        userId: sale.userId,
        metodoPago: sale.metodoPago,
        total: sale.total.toFixed(2),
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
        })),
      })),
    };
  }
}
