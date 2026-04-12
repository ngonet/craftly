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
    <div className="bg-stone-900 text-white rounded-2xl px-6 py-5">
      <p className="text-stone-400 text-sm font-medium uppercase tracking-wider">Total recaudado</p>
      <p className="text-4xl font-extrabold mt-1 tracking-tight">${formatMoney(total)}</p>
      <p className="text-stone-400 text-sm mt-1">
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
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-4">
        <p className="text-green-800 text-xs font-semibold uppercase tracking-wider">Efectivo</p>
        <p className="text-green-900 text-2xl font-extrabold mt-1">
          ${formatMoney(efectivo?.total ?? '0.00')}
        </p>
        <p className="text-green-600 text-xs mt-0.5">
          {efectivo?.count ?? 0} {(efectivo?.count ?? 0) === 1 ? 'venta' : 'ventas'}
        </p>
      </div>

      {/* Transferencia */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-4">
        <p className="text-blue-800 text-xs font-semibold uppercase tracking-wider">
          Transferencia
        </p>
        <p className="text-blue-900 text-2xl font-extrabold mt-1">
          ${formatMoney(transferencia?.total ?? '0.00')}
        </p>
        <p className="text-blue-600 text-xs mt-0.5">
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
      className={`rounded-2xl px-5 py-4 border-2 ${isPositive ? 'bg-craft-50 border-craft-200' : 'bg-red-50 border-red-200'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${isPositive ? 'text-craft-800' : 'text-red-800'}`}
          >
            Ganancia real
          </p>
          <p
            className={`text-3xl font-extrabold mt-1 ${isPositive ? 'text-craft-900' : 'text-red-900'}`}
          >
            ${formatMoney(utilidad)}
          </p>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <p className="text-stone-500">
            Ventas:{' '}
            <span className="font-semibold text-stone-700">${formatMoney(totalVentas)}</span>
          </p>
          <p className="text-stone-500">
            Costo: <span className="font-semibold text-stone-700">${formatMoney(totalCosto)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SaleRow({ sale }: { sale: SaleDto }) {
  const itemSummary = sale.items.map((item) => `${item.quantity}x`).join(', ');

  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 truncate">{itemSummary}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {formatTime(sale.createdAt)}
          <span className="mx-1.5 text-stone-300">·</span>
          {sale.metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}
        </p>
      </div>
      <p className="text-sm font-bold text-stone-900 ml-3">${formatMoney(sale.total)}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          role="img"
          aria-label="Sin ventas"
        >
          <title>Sin ventas</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
      </div>
      <p className="text-stone-500 text-lg font-medium">No hay ventas hoy</p>
      <p className="text-stone-400 text-sm mt-1">
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
          <p className="text-stone-400 text-sm mt-3">Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-red-600 font-medium">No se pudo cargar el resumen</p>
        <p className="text-stone-400 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  if (!data || data.salesCount === 0) {
    return (
      <div className="px-5 pt-4">
        <h2 className="text-lg font-bold text-stone-900 capitalize">{formatDate()}</h2>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-6 space-y-4">
      {/* Date header */}
      <h2 className="text-lg font-bold text-stone-900 capitalize">{formatDate()}</h2>

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
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
          Ventas del dia
        </h3>
        <div className="bg-white rounded-2xl border border-stone-200 px-4">
          {data.sales.map((sale) => (
            <SaleRow key={sale.id} sale={sale} />
          ))}
        </div>
      </div>
    </div>
  );
}
