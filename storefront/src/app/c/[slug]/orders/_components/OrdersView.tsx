'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  listBuyerOrders,
  type ApiError,
  type BuyerOrder,
  type OrderStatus,
} from '@/lib/buyer_orders.api'

type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled'
type StatusColor = 'slate' | 'violet' | 'amber' | 'blue' | 'green' | 'red'

const PAGE_SIZE = 8

const COMPLETED_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'CONFIRMED_BY_CUSTOMER',
  'CONFIRMED_BY_SYSTEM',
  'COMPLETED_SUCCESSFULLY',
  'CLOSED',
  'PICKED_UP',
]

const CANCELLED_STATUSES: OrderStatus[] = [
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SELLER',
  'CANCELLED_BY_SYSTEM',
  'CANCELLED_BY_ADMIN',
  'CANCELLED_NO_PAYMENT',
  'PICKUP_CANCELLED_BY_CUSTOMER',
  'VALIDATION_REJECTED',
]

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusLabel(status: OrderStatus): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    DRAFT: 'Borrador',
    PENDING_CONFIRM: 'Pendiente',
    ORDER_SUBMITTED: 'Enviado',
    EXPIRED: 'Expirado',
    ORDER_VALIDATING: 'Validando',
    MANUAL_REVIEW: 'Revisión manual',
    VALIDATION_APPROVED: 'Validado',
    VALIDATION_REJECTED: 'Rechazado',
    SELLER_CONFIRMED: 'Aceptado',
    PREPARING: 'Preparando',
    AWAITING_COURIER_ASSIGNMENT: 'Buscando repartidor',
    COURIER_ASSIGNED: 'Repartidor asignado',
    READY_TO_SHIP: 'Listo para despacho',
    READY_FOR_PICKUP: 'Listo para recoger',
    SHIPMENT_HOLD: 'Despacho retenido',
    SHIPPED: 'Despachado',
    IN_TRANSIT: 'En tránsito',
    ON_HOLD: 'En espera',
    OUT_FOR_DELIVERY: 'En reparto',
    ARRIVED_AT_CUSTOMER: 'Llegó a destino',
    DELIVERY_ATTEMPTED: 'Entrega intentada',
    DELIVERY_RESCHEDULED: 'Reprogramado',
    LOST_IN_TRANSIT: 'Perdido en tránsito',
    AT_PICKUP_POINT: 'En punto físico',
    CUSTOMER_ARRIVED_AT_PICKUP_POINT: 'En punto físico',
    IDENTITY_VALIDATED: 'Identidad validada',
    PICKUP_AUTH_FAILED: 'Validación fallida',
    PICKUP_POINT_ISSUE: 'Incidente en punto',
    PICKUP_EXPIRED: 'Recogida expirada',
    PICKUP_CANCELLED_BY_CUSTOMER: 'Recogida cancelada',
    PICKED_UP: 'Recogido',
    PAYMENT_COLLECTION_PENDING: 'Cobro pendiente',
    PAYMENT_COLLECTED_ELECTRONIC: 'Cobro electrónico',
    PAYMENT_COLLECTED_CASH: 'Cobro efectivo',
    CASH_COLLECTION_PENDING: 'Efectivo pendiente',
    CASH_PAYMENT_REJECTED: 'Pago rechazado',
    CANCELLED_BY_CUSTOMER: 'Cancelado',
    CANCELLED_BY_SELLER: 'Cancelado',
    CANCELLED_BY_SYSTEM: 'Cancelado',
    CANCELLED_BY_ADMIN: 'Cancelado',
    CANCELLED_NO_PAYMENT: 'Cancelado sin pago',
    CUSTOMER_CANCEL_REQUEST: 'Cancelación solicitada',
    CANCEL_REQUEST_APPROVED: 'Cancelación aprobada',
    CANCEL_REQUEST_REJECTED: 'Cancelación rechazada',
    RETURN_TO_ORIGIN: 'Regresando a origen',
    RETURN_TO_ORIGIN_RECEIVED: 'Devuelto a origen',
    LOST_IN_RETURN: 'Perdido en retorno',
    DELIVERED: 'Entregado',
    DELIVERY_DISPUTED: 'En disputa',
    CONFIRMED_BY_CUSTOMER: 'Recibido confirmado',
    CONFIRMED_BY_SYSTEM: 'Confirmado',
    COMPLETED_SUCCESSFULLY: 'Completado',
    CLOSED: 'Cerrado',
  }
  return labels[status] ?? status
}

function statusColor(status: OrderStatus): StatusColor {
  if (CANCELLED_STATUSES.includes(status) || status.includes('FAILED') || status.includes('LOST')) {
    return 'red'
  }
  if (COMPLETED_STATUSES.includes(status)) return 'green'
  if (
    status === 'ORDER_VALIDATING' ||
    status === 'MANUAL_REVIEW' ||
    status === 'VALIDATION_APPROVED' ||
    status === 'SELLER_CONFIRMED'
  ) return 'violet'
  if (
    status === 'DRAFT' ||
    status === 'PENDING_CONFIRM' ||
    status === 'EXPIRED' ||
    status === 'CLOSED'
  ) return 'slate'
  if (
    status === 'AWAITING_COURIER_ASSIGNMENT' ||
    status === 'ON_HOLD' ||
    status === 'SHIPMENT_HOLD' ||
    status === 'DELIVERY_ATTEMPTED' ||
    status === 'DELIVERY_RESCHEDULED' ||
    status === 'CUSTOMER_CANCEL_REQUEST' ||
    status === 'CANCEL_REQUEST_REJECTED'
  ) return 'amber'
  return 'blue'
}

function filterOrders(orders: BuyerOrder[], filter: OrderFilter): BuyerOrder[] {
  if (filter === 'completed') {
    return orders.filter((order) => COMPLETED_STATUSES.includes(order.order_status))
  }
  if (filter === 'cancelled') {
    return orders.filter((order) => CANCELLED_STATUSES.includes(order.order_status))
  }
  if (filter === 'active') {
    return orders.filter(
      (order) =>
        !COMPLETED_STATUSES.includes(order.order_status) &&
        !CANCELLED_STATUSES.includes(order.order_status),
    )
  }
  return orders
}

function StatusPill({ status }: { status: OrderStatus }) {
  return <RutaPill variant={statusColor(status)}>{statusLabel(status)}</RutaPill>
}

function OrdersSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-40 rounded-md bg-slate-200 dark:bg-slate-700" />
      <RutaCard>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200/70 p-4 dark:border-white/10">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-8 w-28 rounded-md bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </RutaCard>
    </div>
  )
}

export default function OrdersView() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listBuyerOrders({ page: 1, page_size: 100 })
      setOrders(result.data)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'AUTHENTICATION_REQUIRED') {
        router.push(`/c/${slug}/login?return=/c/${slug}/orders`)
        return
      }
      setError(apiError.message ?? 'No pudimos cargar tus pedidos.')
    } finally {
      setLoading(false)
    }
  }, [router, slug])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    setPage(1)
  }, [filter])

  const filteredOrders = useMemo(() => filterOrders(orders, filter), [orders, filter])
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const visibleOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) return <OrdersSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <RutaButton variant="neutral" onClick={loadOrders}>
            Reintentar
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            historial
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Mis pedidos
          </h1>
        </div>
        <Link href={`/c/${slug}`}>
          <RutaButton variant="neutral" className="justify-center">
            Ver catálogo
          </RutaButton>
        </Link>
      </div>

      <RutaCard className="mb-4">
        <RutaSectionHeader title="Filtros" subtitle="estado del pedido" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['completed', 'Completados'],
            ['cancelled', 'Cancelados'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as OrderFilter)}
              className={[
                'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === value
                  ? 'border-sky-400/40 bg-sky-500/[0.12] text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 bg-white/[0.06] text-slate-600 hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </RutaCard>

      {filteredOrders.length === 0 ? (
        <RutaCard className="px-10 py-12 text-center">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Aún no tienes pedidos
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Cuando confirmes un pedido, aparecerá en este historial.
          </p>
          <Link href={`/c/${slug}`} className="mt-6 inline-flex">
            <RutaButton variant="primary">Ver catálogo</RutaButton>
          </Link>
        </RutaCard>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <RutaCard key={order.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                      Pedido #{order.id}
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'} -{' '}
                    {formatCOP(order.total)}
                  </p>
                  <div className="mt-3">
                    <StatusPill status={order.order_status} />
                  </div>
                </div>

                <Link href={`/c/${slug}/orders/${order.id}`} className="shrink-0">
                  <RutaButton variant="secondary" className="w-full justify-center sm:w-auto">
                    Ver detalle
                  </RutaButton>
                </Link>
              </div>
            </RutaCard>
          ))}

          <div className="flex items-center justify-between pt-2">
            <RutaButton
              variant="neutral"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </RutaButton>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Página {page} de {totalPages}
            </span>
            <RutaButton
              variant="neutral"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </RutaButton>
          </div>
        </div>
      )}
    </div>
  )
}
