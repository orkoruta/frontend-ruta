'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { RutaCard } from '@orkoruta/ui'
import {
  getAssignedOrders,
  type ApiError,
  type CourierOrder,
  type CourierOrderStatus,
} from '@/lib/courier_orders.api'

type Tab = 'active' | 'completed'

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

type StatusColor = 'blue' | 'amber' | 'green' | 'slate'

function statusColor(status: CourierOrderStatus): StatusColor {
  if (
    status === 'DELIVERED' ||
    status === 'CONFIRMED_BY_CUSTOMER' ||
    status === 'CONFIRMED_BY_SYSTEM' ||
    status === 'COMPLETED_SUCCESSFULLY'
  ) return 'green'
  if (status === 'DELIVERY_ATTEMPTED') return 'amber'
  if (status === 'COURIER_ASSIGNED') return 'slate'
  return 'blue'
}

function statusLabel(status: CourierOrderStatus): string {
  const labels: Record<CourierOrderStatus, string> = {
    COURIER_ASSIGNED: 'Asignado',
    SHIPPED: 'Despachado',
    IN_TRANSIT: 'En tránsito',
    OUT_FOR_DELIVERY: 'En reparto',
    ARRIVED_AT_CUSTOMER: 'Llegué al cliente',
    DELIVERY_ATTEMPTED: 'Intento fallido',
    DELIVERED: 'Entregado',
    CONFIRMED_BY_CUSTOMER: 'Confirmado',
    CONFIRMED_BY_SYSTEM: 'Confirmado',
    COMPLETED_SUCCESSFULLY: 'Completado',
  }
  return labels[status] ?? status
}

const COLOR_CLASSES: Record<StatusColor, string> = {
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  slate:  'bg-white/[0.06] text-slate-600 border-white/10 dark:text-slate-300',
}

function StatusBadge({ status }: { status: CourierOrderStatus }) {
  const color = statusColor(status)
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
        COLOR_CLASSES[color],
      ].join(' ')}
    >
      {statusLabel(status)}
    </span>
  )
}

function ctaLabel(status: CourierOrderStatus): string {
  switch (status) {
    case 'COURIER_ASSIGNED': return 'Iniciar despacho'
    case 'SHIPPED':
    case 'IN_TRANSIT': return 'Marcar en camino'
    case 'OUT_FOR_DELIVERY': return 'Llegué al cliente'
    case 'ARRIVED_AT_CUSTOMER': return 'Ver y entregar'
    default: return 'Ver detalle'
  }
}

function isCompletedStatus(status: CourierOrderStatus): boolean {
  return (
    status === 'DELIVERED' ||
    status === 'CONFIRMED_BY_CUSTOMER' ||
    status === 'CONFIRMED_BY_SYSTEM' ||
    status === 'COMPLETED_SUCCESSFULLY'
  )
}

function OrderCard({ order }: { order: CourierOrder }) {
  const completed = isCompletedStatus(order.order_status)

  return (
    <Link href={`/courier/${order.id}`}>
      <RutaCard className="transition-shadow hover:shadow-md active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              pedido #{order.id}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {order.delivery_address}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {order.buyer_name}
            </p>
          </div>
          <StatusBadge status={order.order_status} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatCOP(order.total)}
            </p>
            {order.payment_method === 'ON_DELIVERY' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Cobro contra entrega</p>
            )}
          </div>
          {!completed && (
            <span className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 text-sm font-semibold text-sky-700 dark:border-sky-400/25 dark:text-sky-300">
              {ctaLabel(order.order_status)}
            </span>
          )}
        </div>
      </RutaCard>
    </Link>
  )
}

export default function CourierDashboard() {
  const [tab, setTab] = useState<Tab>('active')
  const [active, setActive] = useState<CourierOrder[]>([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAssignedOrders()
      setActive(data.active)
      setCompletedToday(data.completed_today)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cargar los pedidos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const TAB_SELECTED =
    'flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors bg-white border border-slate-200/90 text-slate-900 shadow-sm dark:bg-[#1d2025]/[0.78] dark:border-white/10 dark:text-slate-100'
  const TAB_IDLE =
    'flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            mis pedidos
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Hoy
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-slate-200 bg-white/[0.06] px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          {loading ? '…' : 'Actualizar'}
        </button>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/[0.055]">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={tab === 'active' ? TAB_SELECTED : TAB_IDLE}
        >
          Asignados y en curso
        </button>
        <button
          type="button"
          onClick={() => setTab('completed')}
          className={tab === 'completed' ? TAB_SELECTED : TAB_IDLE}
        >
          Completados hoy ({completedToday})
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando pedidos…
        </p>
      )}

      {!loading && tab === 'active' && (
        <>
          {active.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No tienes pedidos activos en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && tab === 'completed' && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {completedToday}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            entregas completadas hoy
          </p>
        </div>
      )}
    </div>
  )
}
