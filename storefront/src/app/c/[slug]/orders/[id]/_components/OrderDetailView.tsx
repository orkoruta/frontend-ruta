'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  cancelBuyerOrder,
  confirmBuyerOrderReceipt,
  getBuyerOrder,
  requestBuyerOrderCancel,
  type ApiError,
  type BuyerOrder,
  type BuyerOrderHistoryEntry,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/buyer_orders.api'

type StatusColor = 'slate' | 'violet' | 'amber' | 'blue' | 'green' | 'red'
type ActionKind = 'cancel' | 'request-cancel' | 'confirm-receipt'

const DIRECT_CANCEL_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PENDING_CONFIRM',
  'PENDING_ONLINE_PAYMENT' as OrderStatus,
  'ORDER_SUBMITTED',
  'ORDER_VALIDATING',
]

const REQUEST_CANCEL_STATUSES: OrderStatus[] = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status: OrderStatus | string): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    DRAFT: 'Borrador',
    PENDING_CONFIRM: 'Pendiente confirmación',
    ORDER_SUBMITTED: 'Pedido enviado',
    EXPIRED: 'Expirado',
    ORDER_VALIDATING: 'Validando',
    MANUAL_REVIEW: 'Revisión manual',
    VALIDATION_APPROVED: 'Validado',
    VALIDATION_REJECTED: 'Rechazado',
    SELLER_CONFIRMED: 'Aceptado por vendedor',
    PREPARING: 'Preparando',
    AWAITING_COURIER_ASSIGNMENT: 'Buscando repartidor',
    COURIER_ASSIGNED: 'Repartidor asignado',
    READY_TO_SHIP: 'Listo para despacho',
    READY_FOR_PICKUP: 'Listo para recogida',
    SHIPMENT_HOLD: 'Despacho retenido',
    SHIPPED: 'Despachado',
    IN_TRANSIT: 'En tránsito',
    ON_HOLD: 'En espera',
    OUT_FOR_DELIVERY: 'En reparto final',
    ARRIVED_AT_CUSTOMER: 'Llegó al comprador',
    DELIVERY_ATTEMPTED: 'Entrega intentada',
    DELIVERY_RESCHEDULED: 'Entrega reprogramada',
    LOST_IN_TRANSIT: 'Perdido en tránsito',
    AT_PICKUP_POINT: 'Disponible en punto físico',
    CUSTOMER_ARRIVED_AT_PICKUP_POINT: 'Comprador en punto',
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
    CANCELLED_BY_CUSTOMER: 'Cancelado por comprador',
    CANCELLED_BY_SELLER: 'Cancelado por vendedor',
    CANCELLED_BY_SYSTEM: 'Cancelado por sistema',
    CANCELLED_BY_ADMIN: 'Cancelado por admin',
    CANCELLED_NO_PAYMENT: 'Cancelado sin pago',
    CUSTOMER_CANCEL_REQUEST: 'Solicitud de cancelación',
    CANCEL_REQUEST_APPROVED: 'Cancelación aprobada',
    CANCEL_REQUEST_REJECTED: 'Cancelación rechazada',
    RETURN_TO_ORIGIN: 'Regresando a origen',
    RETURN_TO_ORIGIN_RECEIVED: 'Devuelto a origen',
    LOST_IN_RETURN: 'Perdido en retorno',
    DELIVERED: 'Entregado',
    DELIVERY_DISPUTED: 'En disputa',
    CONFIRMED_BY_CUSTOMER: 'Recepción confirmada',
    CONFIRMED_BY_SYSTEM: 'Confirmado por sistema',
    COMPLETED_SUCCESSFULLY: 'Completado',
    CLOSED: 'Cerrado',
  }
  return labels[status as OrderStatus] ?? status
}

function paymentLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    PAYMENT_NOT_STARTED: 'No iniciado',
    PENDING_ONLINE_PAYMENT: 'Pago online pendiente',
    PAYMENT_PROCESSING: 'Procesando pago',
    PAID: 'Pagado',
    PAYMENT_FAILED_RETRYABLE: 'Pago fallido',
    PAYMENT_REJECTED_FINAL: 'Pago rechazado',
    PENDING_COLLECTION: 'Cobro contra entrega pendiente',
    COLLECTION_PROCESSING: 'Registrando cobro',
    PAYMENT_COLLECTED: 'Cobrado',
    PAYMENT_COLLECTION_FAILED: 'Cobro fallido',
    PAYMENT_NOT_COLLECTED: 'No cobrado',
  }
  return labels[status]
}

function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    ONLINE_AT_ORDER: 'Online',
    CASH_ON_DELIVERY: 'Contra entrega en efectivo',
    ELECTRONIC_ON_DELIVERY: 'Contra entrega electrónico',
  }
  return labels[method] ?? method
}

function statusColor(status: OrderStatus | string): StatusColor {
  const orderStatus = status as OrderStatus
  if (CANCELLED_STATUSES.includes(orderStatus) || status.includes('FAILED') || status.includes('LOST')) {
    return 'red'
  }
  if (COMPLETED_STATUSES.includes(orderStatus)) return 'green'
  if (
    orderStatus === 'ORDER_VALIDATING' ||
    orderStatus === 'MANUAL_REVIEW' ||
    orderStatus === 'VALIDATION_APPROVED' ||
    orderStatus === 'SELLER_CONFIRMED'
  ) return 'violet'
  if (
    orderStatus === 'DRAFT' ||
    orderStatus === 'PENDING_CONFIRM' ||
    orderStatus === 'EXPIRED' ||
    orderStatus === 'CLOSED'
  ) return 'slate'
  if (
    orderStatus === 'AWAITING_COURIER_ASSIGNMENT' ||
    orderStatus === 'ON_HOLD' ||
    orderStatus === 'SHIPMENT_HOLD' ||
    orderStatus === 'DELIVERY_ATTEMPTED' ||
    orderStatus === 'DELIVERY_RESCHEDULED' ||
    orderStatus === 'CUSTOMER_CANCEL_REQUEST' ||
    orderStatus === 'CANCEL_REQUEST_REJECTED'
  ) return 'amber'
  return 'blue'
}

function StatusPill({ status }: { status: OrderStatus }) {
  return <RutaPill variant={statusColor(status)}>{statusLabel(status)}</RutaPill>
}

interface TimelineItem {
  key: string
  label: string
  detail?: string | null
  date: string
  status: OrderStatus | string
}

function getEntryStatus(entry: BuyerOrderHistoryEntry): string {
  return entry.to_state ?? entry.to_status ?? 'ORDER_SUBMITTED'
}

function buildTimeline(order: BuyerOrder): TimelineItem[] {
  if (order.history && order.history.length > 0) {
    return [...order.history]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((entry, index) => {
        const status = getEntryStatus(entry)
        return {
          key: String(entry.id ?? `${status}-${index}`),
          label: statusLabel(status),
          detail: entry.reason ?? entry.actor_role ?? entry.changed_by_user_type,
          date: entry.created_at,
          status,
        }
      })
  }

  const derived: TimelineItem[] = [
    {
      key: 'created',
      label: 'Pedido creado',
      date: order.created_at,
      status: 'DRAFT',
    },
  ]

  if (order.submitted_at) {
    derived.push({
      key: 'submitted',
      label: 'Pedido enviado al sistema',
      date: order.submitted_at,
      status: 'ORDER_SUBMITTED',
    })
  }

  if (order.delivered_at) {
    derived.push({
      key: 'delivered',
      label: 'Entregado',
      date: order.delivered_at,
      status: 'DELIVERED',
    })
  }

  if (order.closed_at) {
    derived.push({
      key: 'closed',
      label: statusLabel(order.order_status),
      detail: order.closure_reason,
      date: order.closed_at,
      status: order.order_status,
    })
  } else if (!derived.some((item) => item.status === order.order_status)) {
    derived.push({
      key: 'current',
      label: statusLabel(order.order_status),
      detail: 'Estado actual',
      date: order.updated_at,
      status: order.order_status,
    })
  }

  return derived
}

function TimelineEntry({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const color = statusColor(item.status)
  const dotClasses: Record<StatusColor, string> = {
    slate: 'bg-slate-400 dark:bg-slate-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
    blue: 'bg-sky-500',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={['mt-1 h-3 w-3 rounded-full', dotClasses[color]].join(' ')} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
        {item.detail && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatDateTime(item.date)}
        </p>
      </div>
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-5 h-7 w-40 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <RutaCard className="h-80">
          <span />
        </RutaCard>
        <RutaCard className="h-72">
          <span />
        </RutaCard>
      </div>
    </div>
  )
}

export default function OrderDetailView() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const orderId = Number(id)

  const [order, setOrder] = useState<BuyerOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [actionKind, setActionKind] = useState<ActionKind | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setError('Pedido inválido.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getBuyerOrder(orderId)
      setOrder(result)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'AUTHENTICATION_REQUIRED') {
        router.push(`/c/${slug}/login?return=/c/${slug}/orders/${id}`)
        return
      }
      setError(apiError.message ?? 'No pudimos cargar este pedido.')
    } finally {
      setLoading(false)
    }
  }, [id, orderId, router, slug])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order])

  async function runAction(kind: ActionKind) {
    if (!order) return
    const needsReason = kind === 'cancel' || kind === 'request-cancel'
    if (needsReason && reason.trim().length === 0) {
      setError('Escribe una razón para continuar.')
      return
    }

    setActing(true)
    setError(null)
    setSuccess(null)
    try {
      const updated =
        kind === 'cancel'
          ? await cancelBuyerOrder(order.id, reason.trim())
          : kind === 'request-cancel'
            ? await requestBuyerOrderCancel(order.id, reason.trim())
            : await confirmBuyerOrderReceipt(order.id)

      setOrder(updated)
      setActionKind(null)
      setReason('')
      setSuccess(
        kind === 'confirm-receipt'
          ? 'Recepción confirmada.'
          : kind === 'request-cancel'
            ? 'Solicitud de cancelación enviada.'
            : 'Pedido cancelado.',
      )
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(false)
    }
  }

  if (loading) return <OrderDetailSkeleton />

  if (error && !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <RutaButton variant="neutral" onClick={loadOrder}>
              Reintentar
            </RutaButton>
            <Link href={`/c/${slug}/orders`}>
              <RutaButton variant="secondary">Volver a mis pedidos</RutaButton>
            </Link>
          </div>
        </RutaCard>
      </div>
    )
  }

  if (!order) return null

  const canCancel = DIRECT_CANCEL_STATUSES.includes(order.order_status)
  const canRequestCancel = REQUEST_CANCEL_STATUSES.includes(order.order_status)
  const canConfirmReceipt = order.order_status === 'DELIVERED'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            pedido #{order.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Detalle de pedido
            </h1>
            <StatusPill status={order.order_status} />
          </div>
        </div>
        <Link href={`/c/${slug}/orders`}>
          <RutaButton variant="neutral" className="justify-center">
            Volver a mis pedidos
          </RutaButton>
        </Link>
      </div>

      {(error || success) && (
        <p
          role={error ? 'alert' : 'status'}
          className={[
            'mb-4 rounded-md border px-3 py-2 text-sm',
            error
              ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
              : 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300',
          ].join(' ')}
        >
          {error ?? success}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="RutaTimeline" subtitle="historial del pedido" />
            <div className="mt-3">
              {timeline.map((item, index) => (
                <TimelineEntry
                  key={item.key}
                  item={item}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          </RutaCard>

          <RutaCard>
            <RutaSectionHeader title="Detalle de entrega" subtitle="logística" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Tipo
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {order.delivery_type === 'SHIP' ? 'Domicilio (SHIP)' : 'Punto físico (PICKUP)'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Repartidor
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {order.courier_user_id ? 'Repartidor asignado' : 'Aún no asignado'}
                </dd>
              </div>
              {order.delivery_address && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Dirección
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">
                    {[
                      order.delivery_address.line,
                      order.delivery_address.city,
                      order.delivery_address.state,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                  {order.delivery_address.instructions && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {order.delivery_address.instructions}
                    </p>
                  )}
                </div>
              )}
              {order.pickup_point_id && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Punto físico
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">
                    Punto #{order.pickup_point_id}
                  </dd>
                </div>
              )}
            </dl>
          </RutaCard>
        </div>

        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Resumen del pedido" subtitle="items y totales" />
            <div className="mt-3 divide-y divide-slate-200/70 dark:divide-white/10">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.quantity} x {formatCOP(item.unit_price)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatCOP(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200/70 pt-4 text-sm dark:border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCOP(order.subtotal)}
                </span>
              </div>
              {order.shipping_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Envío</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCOP(order.shipping_fee)}
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Descuento</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    -{formatCOP(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/70 pt-2 dark:border-white/10">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {formatCOP(order.total)}
                </span>
              </div>
            </div>
          </RutaCard>

          <RutaCard>
            <RutaSectionHeader title="Pago" subtitle="estado de cobro" />
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Método
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {paymentMethodLabel(order.payment_method)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Estado
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {paymentLabel(order.payment_status)}
                </dd>
              </div>
            </dl>
          </RutaCard>

          {(canCancel || canRequestCancel || canConfirmReceipt) && (
            <RutaCard>
              <RutaSectionHeader title="Acciones" subtitle="disponibles para este estado" />
              <div className="mt-3 flex flex-col gap-2">
                {canCancel && (
                  <RutaButton
                    variant="danger"
                    className="justify-center"
                    onClick={() => setActionKind(actionKind === 'cancel' ? null : 'cancel')}
                    disabled={acting}
                  >
                    Cancelar pedido
                  </RutaButton>
                )}
                {canRequestCancel && (
                  <RutaButton
                    variant="warning"
                    className="justify-center"
                    onClick={() =>
                      setActionKind(actionKind === 'request-cancel' ? null : 'request-cancel')
                    }
                    disabled={acting}
                  >
                    Solicitar cancelación
                  </RutaButton>
                )}
                {canConfirmReceipt && (
                  <RutaButton
                    variant="success"
                    className="justify-center"
                    onClick={() => runAction('confirm-receipt')}
                    disabled={acting}
                  >
                    Confirmar recepción
                  </RutaButton>
                )}
              </div>

              {(actionKind === 'cancel' || actionKind === 'request-cancel') && (
                <div className="mt-3 rounded-md border border-slate-200/80 bg-white/[0.45] p-3 dark:border-white/10 dark:bg-white/[0.035]">
                  <label
                    htmlFor="cancel-reason"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Razón
                  </label>
                  <textarea
                    id="cancel-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white/[0.8] px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-white/10 dark:bg-[#111214] dark:text-slate-100"
                    placeholder="Cuéntanos por qué quieres cancelar."
                    disabled={acting}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <RutaButton
                      variant="neutral"
                      onClick={() => {
                        setActionKind(null)
                        setReason('')
                      }}
                      disabled={acting}
                    >
                      Cerrar
                    </RutaButton>
                    <RutaButton
                      variant={actionKind === 'cancel' ? 'danger' : 'warning'}
                      onClick={() => runAction(actionKind)}
                      disabled={acting}
                    >
                      {acting ? 'Enviando...' : 'Enviar'}
                    </RutaButton>
                  </div>
                </div>
              )}
            </RutaCard>
          )}
        </div>
      </div>
    </div>
  )
}
