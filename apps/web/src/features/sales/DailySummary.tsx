// Cierre de Caja — Daily Summary screen.
//
// Designed for ONE thing: the artisan glances down at their phone
// between customers and instantly knows how much cash should be in
// their fanny pack. High contrast, big numbers, zero noise.
//
// Layout (top to bottom):
//   1. Date header — "Hoy, sábado 12 de abril"
//   2. Hero card — Total recaudado (BIG number)
//   3. Payment breakdown — Efectivo vs Transferencia side by side
//   4. Profit card — Utilidad real (ventas - costo)
//   5. Sales feed — scrollable list, most recent first

import type { DailySummary as DailySummaryType, SaleDto } from '@craftly/shared';
import { BanknotesIcon } from '../../shared/ui/icons';
import { useDailySummary } from './api';

// ── Helpers ────────────────────────────────────────────────

function formatMoney(value: string): string {
  const num = Number(value);
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// ── Sub-components ─────────────────────────────────────────

function HeroCard({ total, salesCount }: { total: string; salesCount: number }) {
  return (
    <div className="bg-fg-primary text-surface-card rounded-2xl px-6 py-5">
      <p className="text-fg-muted text-sm font-medium uppercase tracking-wider">Total recaudado</p>
      <p className="text-4xl font-extrabold mt-1 tracking-tight">${formatMoney(total)}</p>
      <p className="text-fg-muted text-sm mt-1">
        {salesCount} {salesCount === 1 ? 'venta' : 'ventas'} hoy
      </p>
    </div>
  );
}

function PaymentBreakdown({ data }: { data: DailySummaryType['byMetodoPago'] }) {
  const efectivo = data.find((d) => d.metodoPago === 'EFECTIVO');
  const transferencia = data.find((d) => d.metodoPago === 'TRANSFERENCIA');

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Efectivo — THE number for the fanny pack */}
      <div className="bg-success-soft border-2 border-success rounded-2xl px-4 py-4">
        <p className="text-success-fg text-xs font-semibold uppercase tracking-wider">Efectivo</p>
        <p className="text-success-fg-strong text-2xl font-extrabold mt-1">
          ${formatMoney(efectivo?.total ?? '0.00')}
        </p>
        <p className="text-success-fg text-xs mt-0.5">
          {efectivo?.count ?? 0} {(efectivo?.count ?? 0) === 1 ? 'venta' : 'ventas'}
        </p>
      </div>

      {/* Transferencia */}
      <div className="bg-info-soft border-2 border-info rounded-2xl px-4 py-4">
        <p className="text-info-fg text-xs font-semibold uppercase tracking-wider">Transferencia</p>
        <p className="text-info-fg-strong text-2xl font-extrabold mt-1">
          ${formatMoney(transferencia?.total ?? '0.00')}
        </p>
        <p className="text-info-fg text-xs mt-0.5">
          {transferencia?.count ?? 0} {(transferencia?.count ?? 0) === 1 ? 'venta' : 'ventas'}
        </p>
      </div>
    </div>
  );
}

function ProfitCard({
  totalVentas,
  totalCosto,
  utilidad,
}: Pick<DailySummaryType, 'totalVentas' | 'totalCosto' | 'utilidad'>) {
  const isPositive = Number(utilidad) >= 0;

  return (
    <div
      className={`rounded-2xl px-5 py-4 border-2 ${isPositive ? 'bg-accent-soft border-accent' : 'bg-danger-soft border-danger'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${isPositive ? 'text-accent-fg' : 'text-danger-fg'}`}
          >
            Ganancia real
          </p>
          <p
            className={`text-3xl font-extrabold mt-1 ${isPositive ? 'text-accent-fg-strong' : 'text-danger-fg-strong'}`}
          >
            ${formatMoney(utilidad)}
          </p>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <p className="text-fg-secondary">
            Ventas:{' '}
            <span className="font-semibold text-fg-primary">${formatMoney(totalVentas)}</span>
          </p>
          <p className="text-fg-secondary">
            Costo: <span className="font-semibold text-fg-primary">${formatMoney(totalCosto)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SaleRow({ sale }: { sale: SaleDto }) {
  const itemSummary = sale.items.map((item) => `${item.quantity}x`).join(', ');

  return (
    <div className="flex items-center justify-between py-3 border-b border-soft last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg-primary truncate">{itemSummary}</p>
        <p className="text-xs text-fg-muted mt-0.5">
          {formatTime(sale.createdAt)}
          <span className="mx-1.5 text-fg-muted">·</span>
          {sale.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}
        </p>
      </div>
      <p className="text-sm font-bold text-fg-primary ml-3">${formatMoney(sale.total)}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
        <BanknotesIcon className="w-8 h-8 text-fg-muted" aria-label="Sin ventas" />
      </div>
      <p className="text-fg-secondary text-lg font-medium">No hay ventas hoy</p>
      <p className="text-fg-muted text-sm mt-1">
        Las ventas van a aparecer acá a medida que vendas
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export function DailySummary() {
  const { data, isLoading, error } = useDailySummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-craft-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-fg-muted text-sm mt-3">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-danger-fg font-medium">No se pudo cargar el resumen</p>
        <p className="text-fg-muted text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  if (!data || data.salesCount === 0) {
    return (
      <div className="px-5 pt-4">
        <h2 className="text-lg font-bold text-fg-primary capitalize">{formatDate()}</h2>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-6 space-y-4">
      {/* Date header */}
      <h2 className="text-lg font-bold text-fg-primary capitalize">{formatDate()}</h2>

      {/* Hero — total recaudado */}
      <HeroCard total={data.totalVentas} salesCount={data.salesCount} />

      {/* Efectivo vs Transferencia */}
      <PaymentBreakdown data={data.byMetodoPago} />

      {/* Profit */}
      <ProfitCard
        totalVentas={data.totalVentas}
        totalCosto={data.totalCosto}
        utilidad={data.utilidad}
      />

      {/* Sales feed */}
      <div>
        <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
          Ventas del dia
        </h3>
        <div className="bg-surface-card rounded-2xl border border-subtle px-4">
          {data.sales.map((sale) => (
            <SaleRow key={sale.id} sale={sale} />
          ))}
        </div>
      </div>
    </div>
  );
}
