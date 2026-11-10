'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { todayDateOnly } from '@orkoruta/web-shared'
import { SessionContext } from '@/lib/session-context'
import {
  getCourierCollections,
  type ApiError,
  type CourierCollectionsReport,
} from '@/lib/orders.api'

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value))
}

/** Lunes de la semana del día dado (`YYYY-MM-DD`). */
function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Recaudo por repartidor: cuánto cobró cada uno, en efectivo y por medios
 * electrónicos, en un rango de fechas. Es la cuenta semanal que el negocio
 * hacía a mano para cuadrar el efectivo con los repartidores.
 *
 * Arranca en la semana en curso (lunes a hoy). Lo que el negocio cobró él
 * mismo al entregar va aparte, al final: ese dinero no lo tiene ningún
 * repartidor.
 */
export default function CourierCollectionsPage() {
  const session = useContext(SessionContext)
  const today = todayDateOnly()
  const [dateFrom, setDateFrom] = useState(() => mondayOf(today))
  const [dateTo, setDateTo] = useState(today)
  const [data, setData] = useState<CourierCollectionsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !dateFrom || !dateTo) return
    let active = true
    setLoading(true)
    setError(null)
    getCourierCollections(dateFrom, dateTo)
      .then((res) => {
        if (active) setData(res)
      })
      .catch((err: ApiError) => {
        if (active) setError(err.message ?? 'No pudimos cargar el recaudo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAllowed, dateFrom, dateTo])

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="recaudo" />
      </RutaCard>
    )
  }

  const inputClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100'
  const chip =
    'rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/[0.06] dark:border-white/15 dark:text-slate-300'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            operaciones
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Recaudo por repartidor
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={chip}
            onClick={() => {
              setDateFrom(mondayOf(today))
              setDateTo(today)
            }}
          >
            Esta semana
          </button>
          <button
            type="button"
            className={chip}
            onClick={() => {
              const lastMonday = shiftDate(mondayOf(today), -7)
              setDateFrom(lastMonday)
              setDateTo(shiftDate(lastMonday, 6))
            }}
          >
            Semana pasada
          </button>
          <input type="date" value={dateFrom} onChange={(e) => e.target.value && setDateFrom(e.target.value)} aria-label="Desde" className={inputClass} />
          <span className="text-sm text-slate-500">a</span>
          <input type="date" value={dateTo} onChange={(e) => e.target.value && setDateTo(e.target.value)} aria-label="Hasta" className={inputClass} />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading && !data ? (
        <RutaCard>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        </RutaCard>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RutaCard>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Efectivo cobrado
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                {formatCOP(data.cash_total)}
              </p>
            </RutaCard>
            <RutaCard>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Electrónico (transferencia, Nequi, datáfono)
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                {formatCOP(data.electronic_total)}
              </p>
            </RutaCard>
          </div>

          <RutaCard>
            <RutaSectionHeader title="Por repartidor" subtitle="toca una fila para ver los cobros" />
            {data.couriers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No hubo cobros en estas fechas.</p>
            ) : (
              <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
                {data.couriers.map((c) => {
                  const key = String(c.courier_id ?? 'staff')
                  const isOpen = expanded === key
                  return (
                    <li key={key} className="py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : key)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                        aria-expanded={isOpen}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {c.courier_id === null ? '🏠 ' : '🛵 '}
                            {c.courier_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {c.collections_count} {c.collections_count === 1 ? 'cobro' : 'cobros'}
                            {c.courier_phone ? ` · ${c.courier_phone}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCOP(c.cash_total)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            en efectivo{c.electronic_total > 0 ? ` · ${formatCOP(c.electronic_total)} electrónico` : ''}
                          </p>
                        </div>
                      </button>
                      {isOpen && (
                        <table className="mt-3 w-full text-sm">
                          <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                            {c.collections.map((col) => (
                              <tr key={col.payment_id}>
                                <td className="py-1.5">
                                  <Link href={`/admin/orders/${col.order_id}`} className="font-mono text-brand-700 hover:underline dark:text-brand-300">
                                    #{col.order_id}
                                  </Link>
                                </td>
                                <td className="py-1.5 text-slate-600 dark:text-slate-400">{formatDateTime(col.collected_at)}</td>
                                <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                  {col.method === 'CASH' ? 'Efectivo' : 'Electrónico'}
                                </td>
                                <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                  {formatCOP(col.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </RutaCard>
        </>
      ) : null}
    </div>
  )
}
