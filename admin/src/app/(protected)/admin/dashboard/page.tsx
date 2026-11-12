'use client'

import Link from 'next/link'
import { useContext, useEffect, useMemo, useState } from 'react'
import { RutaCard, RutaSectionHeader, RutaRouteBackdrop } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getClientMetrics,
  getOperationsDashboard,
  type ApiError,
  type ClientMetrics,
  type DashboardOrder,
  type DashboardSection,
  type OperationsDashboard,
} from '@/lib/metrics.api'
import { listCouriers, type Courier } from '@/lib/users.api'
import {
  adminStatusColor,
  adminStatusLabel,
  STATUS_BADGE_CLASSES,
} from '@/lib/admin_status_labels'
import type { OrderStatus } from '@/lib/orders.api'
import { OrderItemsSummary } from '@/components/OrderItemsSummary'
import { useCountUp } from '@/lib/use_count_up'

// ── Formato ──────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** `2026-11-12` → «jue 12 nov». Se lee como día calendario, sin zona. */
function formatDay(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value))
}

const PAYMENT_LABELS: Record<string, string> = {
  ONLINE_AT_ORDER: 'Online al pedir',
  ELECTRONIC_ON_DELIVERY: 'Electrónico al entregar',
  CASH_ON_DELIVERY: 'Efectivo contra entrega',
}

// ── Fechas (día de Bogotá) ───────────────────────────────────────────────────

function bogotaToday(): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

type PresetKey = 'today' | 'tomorrow' | 'yesterday' | 'week' | 'last7' | 'month'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'yesterday', label: 'Ayer' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'week', label: 'Esta semana' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este mes' },
]

function presetRange(key: PresetKey): [string, string] {
  const today = bogotaToday()
  switch (key) {
    case 'today':
      return [today, today]
    case 'tomorrow':
      return [addDays(today, 1), addDays(today, 1)]
    case 'yesterday':
      return [addDays(today, -1), addDays(today, -1)]
    case 'week': {
      // Lunes a domingo.
      const dow = new Date(`${today}T00:00:00Z`).getUTCDay()
      const monday = addDays(today, -((dow + 6) % 7))
      return [monday, addDays(monday, 6)]
    }
    case 'last7':
      return [addDays(today, -6), today]
    case 'month': {
      const first = `${today.slice(0, 8)}01`
      const nextMonth = new Date(`${first}T00:00:00Z`)
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
      return [first, addDays(nextMonth.toISOString().slice(0, 10), -1)]
    }
  }
}

// ── Piezas ───────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  'rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-400/[0.4] dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100'

const INPUT_CLASS =
  'rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

const LABEL_CLASS = 'text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400'

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={[
        'inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
        STATUS_BADGE_CLASSES[adminStatusColor(status as OrderStatus)],
      ].join(' ')}
    >
      {adminStatusLabel(status as OrderStatus)}
    </span>
  )
}

function KpiCard({
  label,
  value,
  hint,
  color,
  format = (n: number) => String(Math.round(n)),
  onClick,
  active,
}: {
  label: string
  value: number
  hint?: string
  color: 'blue' | 'green' | 'amber' | 'slate'
  format?: (n: number) => string
  onClick?: () => void
  active?: boolean
}) {
  const animated = useCountUp(value)
  const colorMap = {
    slate: 'text-slate-900 dark:text-slate-100',
    blue: 'text-brand-700 dark:text-brand-300',
    green: 'text-emerald-700 dark:text-emerald-300',
    amber: 'text-amber-700 dark:text-amber-300',
  }
  const body = (
    <>
      <p className={LABEL_CLASS}>{label}</p>
      <p className={['text-2xl font-black tracking-tight tabular-nums', colorMap[color]].join(' ')}>
        {format(animated)}
      </p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={[
          'u-lift flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors',
          active
            ? 'border-amber-400/60 bg-amber-500/[0.1] dark:border-amber-400/40'
            : 'border-slate-200/90 bg-white/[0.7] hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]',
        ].join(' ')}
      >
        {body}
      </button>
    )
  }
  return <RutaCard className="u-lift flex flex-col gap-1">{body}</RutaCard>
}

/** Lista con barra proporcional: sirve para estado, repartidor, día y pago. */
function BreakdownCard({
  title,
  rows,
  empty = 'Sin datos en este rango.',
}: {
  title: string
  rows: { key: string; label: React.ReactNode; count: number; amount: number }[]
  empty?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <RutaCard className="flex flex-col gap-3">
      <p className={LABEL_CLASS}>{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{r.count}</span>
                  {' · '}
                  {formatCOP(r.amount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-brand-500/[0.7]"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </RutaCard>
  )
}

function ProductsTable({ products }: { products: DashboardSection['products'] }) {
  if (products.length === 0) return null
  return (
    <RutaCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
        <p className={LABEL_CLASS}>Productos</p>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
          <thead className="sticky top-0 bg-slate-50 dark:bg-[#1d2025]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <th className="px-4 py-2.5">Producto</th>
              <th className="px-4 py-2.5 text-right">Unidades</th>
              <th className="px-4 py-2.5 text-right">Pedidos</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {products.map((p) => (
              <tr key={`${p.product_id ?? 'free'}-${p.product_name}`} className="text-slate-700 dark:text-slate-300">
                <td className="px-4 py-2">
                  {p.product_name}
                  {p.sku && <span className="ml-2 font-mono text-xs text-slate-400">{p.sku}</span>}
                </td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {p.quantity}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{p.orders}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCOP(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RutaCard>
  )
}

function OrdersTable({ orders, mode }: { orders: DashboardOrder[]; mode: 'pending' | 'delivered' }) {
  if (orders.length === 0) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {mode === 'pending' ? 'No hay pedidos por entregar en este rango.' : 'No hay entregas en este rango.'}
        </p>
      </RutaCard>
    )
  }
  return (
    <RutaCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
          <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{mode === 'pending' ? 'Entrega' : 'Entregado'}</th>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Repartidor</th>
              <th className="px-4 py-3">Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {orders.map((o) => (
              <tr
                key={o.id}
                className="align-top text-slate-700 hover:bg-slate-50/[0.5] dark:text-slate-300 dark:hover:bg-white/[0.025]"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/admin/orders/${o.id}`} className="text-brand-700 hover:underline dark:text-brand-300">
                    #{o.id}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {mode === 'pending' ? (
                    <>
                      <span className={o.overdue ? 'font-semibold text-amber-700 dark:text-amber-300' : ''}>
                        {formatDay(o.day)}
                      </span>
                      {o.overdue && <span className="ml-1 text-amber-700 dark:text-amber-300">· atrasado</span>}
                      {!o.scheduled_delivery_date && (
                        <span className="block text-slate-400">sin fecha (creado)</span>
                      )}
                    </>
                  ) : (
                    o.delivered_at ? formatDateTime(o.delivered_at) : formatDay(o.day)
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{o.buyer_name}</span>
                  {o.buyer_phone && (
                    <a
                      href={`tel:${o.buyer_phone}`}
                      className="block font-mono text-xs text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {o.buyer_phone}
                    </a>
                  )}
                  {o.address && (
                    <span className="block max-w-[14rem] text-xs text-slate-500 dark:text-slate-400">{o.address}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <OrderItemsSummary items={o.items} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCOP(o.total)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.order_status} />
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.courier_name ?? <span className="text-slate-400">{o.delivery_type === 'PICKUP' ? 'Recoge en punto' : '—'}</span>}
                </td>
                <td className="px-4 py-3 text-xs">{PAYMENT_LABELS[o.payment_method] ?? o.payment_method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RutaCard>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'delivered'

export default function AdminDashboardPage() {
  const session = useContext(SessionContext)
  const isAllowed =
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT' ||
    session?.user_type === 'ADMIN_RUTA'

  const [[dateFrom, dateTo], setRange] = useState<[string, string]>(() => presetRange('today'))
  const [preset, setPreset] = useState<PresetKey | null>('today')
  const [courierId, setCourierId] = useState('')
  const [deliveryType, setDeliveryType] = useState<'' | 'SHIP' | 'PICKUP'>('')
  const [includeBacklog, setIncludeBacklog] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')

  const [data, setData] = useState<OperationsDashboard | null>(null)
  const [general, setGeneral] = useState<ClientMetrics | null>(null)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isAllowed) return
    listCouriers({ page_size: 100 })
      .then((res) => setCouriers(res.data ?? []))
      .catch(() => setCouriers([]))
    getClientMetrics()
      .then(setGeneral)
      .catch(() => setGeneral(null))
  }, [isAllowed])

  useEffect(() => {
    if (!isAllowed) return
    if (!dateFrom || !dateTo) return
    let active = true
    setLoading(true)
    setError(null)
    getOperationsDashboard({
      date_from: dateFrom <= dateTo ? dateFrom : dateTo,
      date_to: dateFrom <= dateTo ? dateTo : dateFrom,
      courier_id: courierId ? Number(courierId) : undefined,
      delivery_type: deliveryType || undefined,
      include_backlog: includeBacklog,
    })
      .then((res) => {
        if (active) setData(res)
      })
      .catch((err) => {
        if (active) setError((err as ApiError).message ?? 'No pudimos cargar el dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isAllowed, dateFrom, dateTo, courierId, deliveryType, includeBacklog, reloadKey])

  const section: DashboardSection | null = data ? data[tab] : null

  const progress = useMemo(() => {
    if (!data) return null
    const pendingInRange = data.pending.count - (data.include_backlog ? data.pending.backlog_count : 0)
    const total = pendingInRange + data.delivered.count
    return total === 0 ? null : Math.round((data.delivered.count / total) * 100)
  }, [data])

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="dashboard" />
        <p className="text-sm text-slate-600 dark:text-slate-400">No tienes permiso para ver esta sección.</p>
      </RutaCard>
    )
  }

  const rangeLabel =
    dateFrom === dateTo ? formatDay(dateFrom) : `${formatDay(dateFrom)} – ${formatDay(dateTo)}`

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="u-in relative isolate -mx-4 -mt-4 overflow-hidden px-4 pb-2 pt-4">
        <RutaRouteBackdrop variant="corner" />
        <p className={LABEL_CLASS.replace('0.18em', '0.24em')}>operaciones</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pedidos por entregar y entregados · {rangeLabel}
        </p>
      </div>

      {/* Filtros */}
      <RutaCard className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rango rápido">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setRange(presetRange(p.key))
                setPreset(p.key)
              }}
              aria-pressed={preset === p.key}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                preset === p.key
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.05]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                if (!e.target.value) return
                setRange([e.target.value, dateTo < e.target.value ? e.target.value : dateTo])
                setPreset(null)
              }}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Hasta</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => {
                if (!e.target.value) return
                setRange([dateFrom > e.target.value ? e.target.value : dateFrom, e.target.value])
                setPreset(null)
              }}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Repartidor</span>
            <select value={courierId} onChange={(e) => setCourierId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Todos</option>
              {couriers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Tipo de entrega</span>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as '' | 'SHIP' | 'PICKUP')}
              className={SELECT_CLASS}
            >
              <option value="">Todas</option>
              <option value="SHIP">Domicilio</option>
              <option value="PICKUP">Recogida en punto</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeBacklog}
                onChange={(e) => setIncludeBacklog(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Incluir atrasados
            </label>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="self-start text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Actualizar
            </button>
          </div>
        </div>
      </RutaCard>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="u-skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className={['flex flex-col gap-5 transition-opacity', loading ? 'opacity-60' : ''].join(' ')}>
          {/* KPIs */}
          <div className="u-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Por entregar"
              value={data.pending.count}
              hint={`${formatCOP(data.pending.total_amount)} · ${data.pending.units} und.`}
              color="blue"
            />
            <KpiCard
              label="Entregados"
              value={data.delivered.count}
              hint={`${formatCOP(data.delivered.total_amount)} · ${data.delivered.units} und.`}
              color="green"
            />
            <KpiCard
              label="Valor entregado"
              value={data.delivered.total_amount}
              format={formatCOP}
              hint={progress === null ? 'Sin pedidos en el rango' : `${progress}% del rango entregado`}
              color="slate"
            />
            <KpiCard
              label="Atrasados"
              value={data.pending.backlog_count}
              hint={
                data.pending.backlog_count === 0
                  ? 'Nada pendiente de días anteriores'
                  : `${formatCOP(data.pending.backlog_amount)} · ${includeBacklog ? 'incluidos' : 'clic para incluir'}`
              }
              color="amber"
              active={includeBacklog}
              onClick={
                data.pending.backlog_count > 0
                  ? () => {
                      setIncludeBacklog((v) => !v)
                      setTab('pending')
                    }
                  : undefined
              }
            />
          </div>

          {progress !== null && (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/[0.08]">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{progress}% entregado</span>
            </div>
          )}

          {/* Pestañas */}
          <div className="flex gap-1 border-b border-slate-200/90 dark:border-white/10" role="tablist">
            {(
              [
                ['pending', `Por entregar (${data.pending.count})`],
                ['delivered', `Entregados (${data.delivered.count})`],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={[
                  '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                  tab === key
                    ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {section && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                {tab === 'pending' ? (
                  <BreakdownCard
                    title="Por estado"
                    rows={section.by_status.map((r) => ({
                      key: r.status,
                      label: adminStatusLabel(r.status as OrderStatus),
                      count: r.count,
                      amount: r.total_amount,
                    }))}
                  />
                ) : (
                  <BreakdownCard
                    title="Por forma de pago"
                    rows={section.by_payment_method.map((r) => ({
                      key: r.payment_method,
                      label: PAYMENT_LABELS[r.payment_method] ?? r.payment_method,
                      count: r.count,
                      amount: r.total_amount,
                    }))}
                  />
                )}
                <BreakdownCard
                  title="Por repartidor"
                  rows={section.by_courier.map((r) => ({
                    key: String(r.courier_id ?? 'none'),
                    label: r.courier_name,
                    count: r.count,
                    amount: r.total_amount,
                  }))}
                />
                <BreakdownCard
                  title={tab === 'pending' ? 'Por día de entrega' : 'Por día entregado'}
                  rows={section.by_day.map((r) => ({
                    key: r.date,
                    label: formatDay(r.date),
                    count: r.count,
                    amount: r.total_amount,
                  }))}
                />
              </div>

              <ProductsTable products={section.products} />

              <div className="flex flex-col gap-2">
                <RutaSectionHeader
                  title={tab === 'pending' ? 'Pedidos por entregar' : 'Pedidos entregados'}
                  subtitle={rangeLabel}
                  className="mb-0"
                />
                {tab === 'pending' && data.pending.undated_count > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {data.pending.undated_count} sin día de entrega programado: se ubican por su fecha de creación.
                  </p>
                )}
                {section.truncated && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Se muestran los primeros {section.orders.length}; los totales cuentan todos. Acota el rango para ver el resto.
                  </p>
                )}
                <OrdersTable orders={section.orders} mode={tab} />
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Resumen general y accesos */}
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {general && (
          <RutaCard className="grid grid-cols-3 gap-3">
            <div>
              <p className={LABEL_CLASS}>Pedidos hoy</p>
              <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{general.orders_today}</p>
            </div>
            <div>
              <p className={LABEL_CLASS}>Repartidores</p>
              <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{general.active_couriers}</p>
            </div>
            <div>
              <p className={LABEL_CLASS}>Compradores</p>
              <p className="text-xl font-black tabular-nums text-slate-900 dark:text-slate-100">{general.registered_buyers}</p>
            </div>
          </RutaCard>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/orders"
            className="u-lift inline-flex items-center rounded-lg border border-brand-400/40 bg-brand-500/[0.12] px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-500/[0.2] dark:border-brand-400/25 dark:text-brand-300"
          >
            Ver todos los pedidos
          </Link>
          <Link
            href="/admin/orders/dispatch"
            className="u-lift inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.04]"
          >
            Despacho del día
          </Link>
          <Link
            href="/admin/orders/map"
            className="u-lift inline-flex items-center rounded-lg border border-violet-400/40 bg-violet-500/[0.12] px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-500/[0.2] dark:border-violet-400/25 dark:text-violet-300"
          >
            Mapa de asignación
          </Link>
        </div>
      </div>
    </div>
  )
}
