'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { todayDateOnly } from '@orkoruta/web-shared'
import { SessionContext } from '@/lib/session-context'
import { getDailyDispatch, type ApiError, type DailyDispatch } from '@/lib/orders.api'
import { adminStatusLabel, adminStatusColor, STATUS_BADGE_CLASSES } from '@/lib/admin_status_labels'

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function longDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

/**
 * Despacho del día: cuántas cajas y de qué productos hay que alistar para un
 * día de entrega, y la lista de pedidos que salen.
 *
 * Cuenta los pedidos con ese **día de entrega** fijado (no los creados ese
 * día). Los que no tienen día se avisan aparte para que nadie los olvide.
 */
export default function DailyDispatchPage() {
  const session = useContext(SessionContext)
  const [date, setDate] = useState(() => todayDateOnly())
  const [data, setData] = useState<DailyDispatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !date) return
    let active = true
    setLoading(true)
    setError(null)
    getDailyDispatch(date)
      .then((res) => {
        if (active) setData(res)
      })
      .catch((err: ApiError) => {
        if (active) setError(err.message ?? 'No pudimos cargar el despacho.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAllowed, date])

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="despacho" />
      </RutaCard>
    )
  }

  const navButton =
    'rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/[0.06] dark:border-white/15 dark:text-slate-300'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            operaciones
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Despacho del día
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">{longDate(date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={navButton} onClick={() => setDate(shiftDate(date, -1))}>
            ← Anterior
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Día de entrega"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100"
          />
          <button type="button" className={navButton} onClick={() => setDate(shiftDate(date, 1))}>
            Siguiente →
          </button>
          <button type="button" className={navButton} onClick={() => setDate(todayDateOnly())}>
            Hoy
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {data && data.undated_pending_count > 0 && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {data.undated_pending_count === 1
            ? 'Hay 1 pedido activo sin día de entrega: no entra en este resumen.'
            : `Hay ${data.undated_pending_count} pedidos activos sin día de entrega: no entran en este resumen.`}{' '}
          Fíjales el día desde su detalle.
        </p>
      )}

      {loading && !data ? (
        <RutaCard>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        </RutaCard>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Cajas / unidades a alistar', value: data.total_units },
              { label: 'Pedidos del día', value: data.orders_count },
              { label: 'Ya entregados', value: `${data.delivered_count} de ${data.orders_count}` },
            ].map((tile) => (
              <RutaCard key={tile.label}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {tile.label}
                </p>
                <p className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                  {tile.value}
                </p>
              </RutaCard>
            ))}
          </div>

          <RutaCard>
            <RutaSectionHeader title="Qué alistar" subtitle="productos y cantidades" />
            {data.products.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay pedidos con entrega programada para este día.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <th className="py-2">Producto</th>
                    <th className="py-2 text-right">Cantidad</th>
                    <th className="py-2 text-right">En pedidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {data.products.map((p) => (
                    <tr key={`${p.product_id ?? 'x'}-${p.product_name}`}>
                      <td className="py-2 text-slate-900 dark:text-slate-100">
                        {p.product_name}
                        {p.product_id === null && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(línea libre)</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {p.quantity}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{p.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </RutaCard>

          {data.orders.length > 0 && (
            <RutaCard>
              <RutaSectionHeader title="Pedidos" subtitle="los que salen este día" />
              <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
                {data.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Link href={`/admin/orders/${o.id}`} className="font-mono text-brand-700 hover:underline dark:text-brand-300">
                          #{o.id}
                        </Link>
                        {o.buyer_name}
                        {o.buyer_type === 'CORPORATE' && (
                          <span className="rounded border border-violet-400/40 px-1.5 text-[10px] font-bold uppercase text-violet-700 dark:text-violet-300">
                            corporativo
                          </span>
                        )}
                        <span
                          className={[
                            'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                            STATUS_BADGE_CLASSES[adminStatusColor(o.order_status)],
                          ].join(' ')}
                        >
                          {adminStatusLabel(o.order_status)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[o.address, o.buyer_phone, o.courier_name ? `🛵 ${o.courier_name}` : 'sin repartidor']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                        {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatCOP(o.total)}
                    </p>
                  </li>
                ))}
              </ul>
            </RutaCard>
          )}
        </>
      ) : null}
    </div>
  )
}
