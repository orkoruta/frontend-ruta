'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getClientMetrics,
  type ClientMetrics,
  type ApiError,
} from '@/lib/metrics.api'

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}

function MetricCard({
  label,
  value,
  color = 'slate',
}: {
  label: string
  value: string | number
  color?: 'slate' | 'blue' | 'green' | 'amber'
}) {
  const colorMap: Record<string, string> = {
    slate: 'text-slate-900 dark:text-slate-100',
    blue: 'text-sky-700 dark:text-sky-300',
    green: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
  }

  return (
    <RutaCard className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={['text-2xl font-black tracking-tight', colorMap[color]].join(' ')}>
        {value}
      </p>
    </RutaCard>
  )
}

export default function AdminDashboardPage() {
  const session = useContext(SessionContext)
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAllowed =
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT' ||
    session?.user_type === 'ADMIN_RUTA'

  useEffect(() => {
    if (!isAllowed) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getClientMetrics()
        if (!active) return
        setMetrics(data)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar las métricas.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => { active = false }
  }, [isAllowed])

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="dashboard" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          operaciones
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Dashboard
        </h1>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-slate-200/60 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      ) : metrics ? (
        <>
          <div>
            <RutaSectionHeader title="Resumen de hoy" subtitle="métricas" />
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Pedidos hoy"
                value={metrics.orders_today}
                color="blue"
              />
              <MetricCard
                label="Repartidores activos"
                value={metrics.active_couriers}
                color="green"
              />
              <MetricCard
                label="Compradores registrados"
                value={metrics.registered_buyers}
                color="slate"
              />
              <MetricCard
                label="Ingresos (7 días)"
                value={formatCOP(metrics.revenue_last_7_days)}
                color="amber"
              />
            </div>
          </div>

          <div>
            <RutaSectionHeader title="Acciones rápidas" subtitle="operaciones" />
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/admin/orders"
                className="inline-flex items-center rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-500/[0.2] dark:border-sky-400/25 dark:text-sky-300"
              >
                Ver todos los pedidos
              </Link>
              <Link
                href="/admin/orders/map"
                className="inline-flex items-center rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-500/[0.2] dark:border-violet-400/25 dark:text-violet-300"
              >
                Mapa de asignación
              </Link>
              <Link
                href="/admin/products"
                className="inline-flex items-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Crear producto
              </Link>
            </div>
          </div>

          {metrics.orders_by_status.length > 0 && (
            <RutaCard className="overflow-hidden p-0">
              <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
                <RutaSectionHeader
                  title="Pedidos por estado"
                  subtitle="distribución"
                  className="mb-0"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
                  <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                    {metrics.orders_by_status.map(({ status, count }) => (
                      <tr
                        key={status}
                        className="text-slate-700 hover:bg-slate-50/[0.5] dark:text-slate-300 dark:hover:bg-white/[0.025]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {status}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                          {count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </RutaCard>
          )}
        </>
      ) : null}
    </div>
  )
}
