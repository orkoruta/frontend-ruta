'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getOrder,
  acceptOrder,
  confirmCorporateOrder,
  rejectOrder,
  markPreparing,
  markReady,
  cancelOrder,
  approveCancelRequest,
  rejectCancelRequest,
  type ApiError,
  type OrderDetail,
  type DeliveryCarrierType,
  type OrderStatus,
  type OrderStateHistoryEntry,
  type RefundOrderStatus,
} from '@/lib/orders.api'
import {
  initiateRefund,
  type RefundModality,
} from '@/lib/refunds.api'
import { PickupActions } from './_components/PickupActions'

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status: OrderStatus): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    DRAFT: 'Borrador',
    PENDING_CONFIRM: 'Pendiente confirmación',
    ORDER_SUBMITTED: 'Enviado',
    EXPIRED: 'Expirado',
    ORDER_VALIDATING: 'Validando',
    MANUAL_REVIEW: 'Revisión manual',
    VALIDATION_APPROVED: 'Validación aprobada',
    VALIDATION_REJECTED: 'Validación rechazada',
    SELLER_CONFIRMED: 'Aceptado por vendedor',
    PREPARING: 'Preparando',
    AWAITING_COURIER_ASSIGNMENT: 'Sin repartidor',
    COURIER_ASSIGNED: 'Repartidor asignado',
    READY_TO_SHIP: 'Listo para despacho',
    READY_FOR_PICKUP: 'Listo para recogida',
    SHIPMENT_HOLD: 'Despacho retenido',
    SHIPPED: 'Despachado',
    IN_TRANSIT: 'En tránsito',
    ON_HOLD: 'Tránsito retenido',
    OUT_FOR_DELIVERY: 'En reparto final',
    ARRIVED_AT_CUSTOMER: 'Llegó al comprador',
    DELIVERY_ATTEMPTED: 'Entrega intentada',
    DELIVERY_RESCHEDULED: 'Entrega reprogramada',
    LOST_IN_TRANSIT: 'Perdido en tránsito',
    AT_PICKUP_POINT: 'Disponible en punto físico',
    CUSTOMER_ARRIVED_AT_PICKUP_POINT: 'Comprador en punto',
    DELIVERED: 'Entregado',
    DELIVERY_DISPUTED: 'En disputa',
    CONFIRMED_BY_CUSTOMER: 'Confirmado por comprador',
    CONFIRMED_BY_SYSTEM: 'Confirmado por sistema',
    CANCELLED_BY_CUSTOMER: 'Cancelado (comprador)',
    CANCELLED_BY_SELLER: 'Cancelado (vendedor)',
    CANCELLED_BY_SYSTEM: 'Cancelado (sistema)',
    CANCELLED_BY_ADMIN: 'Cancelado (admin)',
    CANCELLED_NO_PAYMENT: 'Cancelado sin pago',
    CUSTOMER_CANCEL_REQUEST: 'Solicitud de cancelación',
    CANCEL_REQUEST_APPROVED: 'Cancelación aprobada',
    CANCEL_REQUEST_REJECTED: 'Cancelación rechazada',
    RETURN_TO_ORIGIN: 'Regresando a origen',
    RETURN_TO_ORIGIN_RECEIVED: 'Devuelto a origen',
    LOST_IN_RETURN: 'Perdido en retorno',
    CLOSED: 'Cerrado',
    COMPLETED_SUCCESSFULLY: 'Completado',
  }
  return labels[status] ?? status
}

type StatusColor = 'slate' | 'violet' | 'amber' | 'blue' | 'green' | 'red'

function statusColor(status: OrderStatus): StatusColor {
  if (
    status === 'DRAFT' ||
    status === 'PENDING_CONFIRM' ||
    status === 'EXPIRED' ||
    status === 'CLOSED'
  ) return 'slate'

  if (
    status === 'ORDER_VALIDATING' ||
    status === 'MANUAL_REVIEW' ||
    status === 'VALIDATION_APPROVED' ||
    status === 'SELLER_CONFIRMED'
  ) return 'violet'

  if (
    status === 'AWAITING_COURIER_ASSIGNMENT' ||
    status === 'ON_HOLD' ||
    status === 'SHIPMENT_HOLD' ||
    status === 'DELIVERY_ATTEMPTED' ||
    status === 'DELIVERY_RESCHEDULED' ||
    status === 'CUSTOMER_CANCEL_REQUEST' ||
    status === 'CANCEL_REQUEST_APPROVED' ||
    status === 'CANCEL_REQUEST_REJECTED' ||
    status === 'IDENTITY_VALIDATED' ||
    status === 'PICKUP_AUTH_FAILED' ||
    status === 'PICKUP_POINT_ISSUE' ||
    status === 'PICKUP_EXPIRED' ||
    status === 'PICKUP_CANCELLED_BY_CUSTOMER' ||
    status === 'PAYMENT_COLLECTION_PENDING' ||
    status === 'CASH_COLLECTION_PENDING' ||
    status === 'RETURN_TO_ORIGIN'
  ) return 'amber'

  if (
    status === 'PREPARING' ||
    status === 'COURIER_ASSIGNED' ||
    status === 'READY_TO_SHIP' ||
    status === 'READY_FOR_PICKUP' ||
    status === 'SHIPPED' ||
    status === 'IN_TRANSIT' ||
    status === 'OUT_FOR_DELIVERY' ||
    status === 'ARRIVED_AT_CUSTOMER' ||
    status === 'AT_PICKUP_POINT' ||
    status === 'CUSTOMER_ARRIVED_AT_PICKUP_POINT' ||
    status === 'ORDER_SUBMITTED'
  ) return 'blue'

  if (
    status === 'DELIVERED' ||
    status === 'CONFIRMED_BY_CUSTOMER' ||
    status === 'CONFIRMED_BY_SYSTEM' ||
    status === 'COMPLETED_SUCCESSFULLY' ||
    status === 'RETURN_TO_ORIGIN_RECEIVED' ||
    status === 'PICKED_UP' ||
    status === 'PAYMENT_COLLECTED_ELECTRONIC' ||
    status === 'PAYMENT_COLLECTED_CASH'
  ) return 'green'

  return 'red'
}

const STATUS_BADGE: Record<StatusColor, string> = {
  slate:  'bg-white/[0.06] text-slate-600 border-slate-200 dark:border-white/10 dark:text-slate-300',
  violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}

const TIMELINE_DOT: Record<StatusColor, string> = {
  slate:  'bg-slate-400 dark:bg-slate-500',
  violet: 'bg-violet-500',
  amber:  'bg-amber-500',
  blue:   'bg-sky-500',
  green:  'bg-emerald-500',
  red:    'bg-rose-500',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = statusColor(status)
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
        STATUS_BADGE[color],
      ].join(' ')}
    >
      {statusLabel(status)}
    </span>
  )
}

function TimelineEntry({ entry, isLast }: { entry: OrderStateHistoryEntry; isLast: boolean }) {
  const color = statusColor(entry.new_value as OrderStatus)
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={['mt-1 h-3 w-3 flex-shrink-0 rounded-full', TIMELINE_DOT[color]].join(' ')} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {statusLabel(entry.new_value as OrderStatus)}
        </p>
        {entry.reason && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{entry.reason}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatDate(entry.occurred_at)}
          {entry.actor_type && ` · ${entry.actor_type}`}
        </p>
      </div>
    </div>
  )
}

// Estados desde los que el state machine admite CANCELLED_BY_ADMIN, sea directo
// o pasando por una retención (SHIPMENT_HOLD en SHIP, PICKUP_POINT_ISSUE en
// PICKUP). Fuera de esta lista el backend responde 422, así que el botón no
// debe ofrecerse.
const CANCELLABLE_STATUSES: OrderStatus[] = [
  'MANUAL_REVIEW',
  'PREPARING',
  'AWAITING_COURIER_ASSIGNMENT',
  'READY_TO_SHIP',
  'READY_FOR_PICKUP',
  'SHIPMENT_HOLD',
  'ON_HOLD',
  'PICKUP_POINT_ISSUE',
  'CUSTOMER_CANCEL_REQUEST',
]

interface OrderDetailClientProps {
  orderId: number
}

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const session = useContext(SessionContext)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estado del formulario de iniciar reembolso
  // Solo aplica a SHIP: decide si el pedido va a asignación de repartidor
  // (flota propia) o directo a despacho (mensajería externa).
  const [carrierType, setCarrierType] = useState<DeliveryCarrierType>('OWN_FLEET')
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundModality, setRefundModality] = useState<RefundModality>('STORE_CREDIT')
  const [refundReason, setRefundReason] = useState('')
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !Number.isFinite(orderId) || orderId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getOrder(orderId)
        if (!active) return
        setOrder(data)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar el pedido.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => { active = false }
  }, [isAllowed, orderId])

  async function refetch() {
    if (!Number.isFinite(orderId) || orderId <= 0) return
    try {
      const data = await getOrder(orderId)
      setOrder(data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos recargar el pedido.')
    }
  }

  async function runAction(fn: () => Promise<OrderDetail>, msg: string) {
    setActing(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await fn()
      setOrder(updated)
      setSuccess(msg)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(false)
    }
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="pedido" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando pedido…</p>
      </RutaCard>
    )
  }

  if (!order) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Pedido no disponible" subtitle="detalle" />
        {error && (
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        )}
      </RutaCard>
    )
  }

  async function handleInitiateRefund(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsedAmount = parseFloat(refundAmount)
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return

    setRefundLoading(true)
    setRefundError(null)

    try {
      await initiateRefund(orderId, parsedAmount, refundModality, refundReason.trim() || undefined)
      setShowRefundForm(false)
      setRefundAmount('')
      setRefundReason('')
      setSuccess('Reembolso iniciado. Puedes gestionarlo desde la sección de Reembolsos.')
      await refetch()
    } catch (err) {
      const apiErr = err as { message?: string }
      setRefundError(apiErr.message ?? 'No pudimos iniciar el reembolso.')
    } finally {
      setRefundLoading(false)
    }
  }

  const isApiOrder = order.order_origin === 'API'
  const status = order.order_status
  // Flujo 1 actions are hidden for API orders (LOGISTICS_ONLY_FEATURE_UNAVAILABLE)
  const showAcceptReject = !isApiOrder && status === 'VALIDATION_APPROVED'
  // Flujo 6: un DRAFT corporativo lo confirma el Cliente; el comprador
  // corporativo no usa la tienda y el pedido expiraría en 24 h.
  const showConfirmCorporate =
    !isApiOrder && status === 'DRAFT' && order.buyer_type === 'CORPORATE'
  const showMarkPreparing = status === 'SELLER_CONFIRMED'
  const showMarkReady = status === 'PREPARING'
  const showGoToMap = status === 'AWAITING_COURIER_ASSIGNMENT'
  const showCancel = CANCELLABLE_STATUSES.includes(status)
  const showApproveCancelRequest = status === 'CUSTOMER_CANCEL_REQUEST'

  const refundStatus = order.refund_status as RefundOrderStatus
  const showRefundSection = refundStatus !== 'REFUND_NOT_REQUIRED'
  // Refund initiation is a Flujo 1 feature — hide for API orders
  const showInitiateRefundButton = !isApiOrder && refundStatus === 'REFUND_PENDING' && !showRefundForm

  // El historial mezcla dimensiones (order_status, payment_status, refund_status…).
  // Esta línea de tiempo es la del pedido; las demás tienen su propia pantalla.
  const sortedHistory = [...(order.history ?? [])]
    .filter((entry) => entry.state_dimension === 'order_status')
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            pedido #{order.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={order.order_status} />
            {isApiOrder && (
              <span className="inline-flex items-center rounded-md border border-sky-400/40 bg-sky-500/[0.18] px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-400/25 dark:text-sky-300">
                Pedido vía API
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver a pedidos
        </Link>
      </div>

      {(error || success) && (
        <p
          role={error ? 'alert' : 'status'}
          className={[
            'rounded-md border px-3 py-2 text-sm',
            error
              ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
              : 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300',
          ].join(' ')}
        >
          {error ?? success}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Buyer */}
          <RutaCard>
            <RutaSectionHeader title="Comprador" subtitle="datos de contacto" />
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Nombre
                </dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {order.buyer.name}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Email
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{order.buyer.email}</dd>
              </div>
              {order.buyer.phone && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Teléfono
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{order.buyer.phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Tipo entrega
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {order.delivery_type === 'SHIP' ? 'Domicilio (SHIP)' : 'Punto físico (PICKUP)'}
                </dd>
              </div>
              {order.delivery_address && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Dirección
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{order.delivery_address}</dd>
                </div>
              )}
              {order.pickup_point_name && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Punto de recogida
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{order.pickup_point_name}</dd>
                </div>
              )}
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Notas
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{order.notes}</dd>
                </div>
              )}
            </dl>
          </RutaCard>

          {/* Courier */}
          {order.courier && (
            <RutaCard>
              <RutaSectionHeader title="Repartidor" subtitle="asignado" />
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Nombre
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {order.courier.name}
                  </dd>
                </div>
                {order.courier.phone && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Teléfono
                    </dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-300">
                      {order.courier.phone}
                    </dd>
                  </div>
                )}
              </dl>
            </RutaCard>
          )}

          {/* Timeline */}
          <RutaCard>
            <RutaSectionHeader title="Historial de estados" subtitle="timeline" />
            {sortedHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin historial registrado.
              </p>
            ) : (
              <div className="mt-2">
                {sortedHistory.map((entry, idx) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    isLast={idx === sortedHistory.length - 1}
                  />
                ))}
              </div>
            )}
          </RutaCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Order summary */}
          <RutaCard>
            <RutaSectionHeader title="Resumen del pedido" subtitle="items y totales" />
            <div className="mt-2 divide-y divide-slate-200/70 dark:divide-white/10">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between py-2.5">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.product_name}
                    </p>
                    {item.product_sku && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: {item.product_sku}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.quantity} × {formatCOP(item.unit_price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCOP(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 border-t border-slate-200/70 pt-3 text-sm dark:border-white/10">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{formatCOP(order.subtotal)}</span>
              </div>
              {order.shipping_fee !== null && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Envío</span>
                  <span>{formatCOP(order.shipping_fee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                <span>Total</span>
                <span>{formatCOP(order.total)}</span>
              </div>
            </div>
          </RutaCard>

          {/* Payment */}
          {order.payment && (
            <RutaCard>
              <RutaSectionHeader title="Pago" subtitle="estado y método" />
              <dl className="mt-2 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Estado</dt>
                  <dd className="font-medium text-slate-900 dark:text-slate-100">
                    {order.payment.status}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Método</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{order.payment.method}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Monto</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCOP(order.payment.amount)}
                  </dd>
                </div>
                {order.payment.confirmed_at && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Confirmado</dt>
                    <dd className="text-slate-700 dark:text-slate-300">
                      {formatDate(order.payment.confirmed_at)}
                    </dd>
                  </div>
                )}
                {order.payment.evidence_url && (
                  <div className="pt-1">
                    <a
                      href={order.payment.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                    >
                      Ver evidencia
                    </a>
                  </div>
                )}
              </dl>
            </RutaCard>
          )}

          {/* Actions */}
          <RutaCard>
            <RutaSectionHeader title="Acciones" subtitle="gestión del pedido" />
            <div className="mt-3 flex flex-col gap-2">
              {showConfirmCorporate && (
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      () => confirmCorporateOrder(orderId),
                      'Pedido corporativo enviado.',
                    )
                  }
                >
                  Confirmar y enviar pedido
                </RutaButton>
              )}

              {showAcceptReject && (
                <>
                  <RutaButton
                    type="button"
                    variant="success"
                    disabled={acting}
                    onClick={() =>
                      void runAction(() => acceptOrder(orderId), 'Pedido aceptado.')
                    }
                  >
                    Aceptar pedido
                  </RutaButton>
                  <RutaButton
                    type="button"
                    variant="danger"
                    disabled={acting}
                    onClick={() =>
                      void runAction(() => rejectOrder(orderId), 'Pedido rechazado.')
                    }
                  >
                    Rechazar pedido
                  </RutaButton>
                </>
              )}

              {showMarkPreparing && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() => markPreparing(orderId), 'Pedido en preparación.')
                  }
                >
                  Marcar preparando
                </RutaButton>
              )}

              {showMarkReady && (
                <>
                  {order.delivery_type === 'SHIP' && (
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="carrier-type"
                        className="text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Transportador
                      </label>
                      <select
                        id="carrier-type"
                        value={carrierType}
                        disabled={acting}
                        onChange={(e) =>
                          setCarrierType(e.target.value as DeliveryCarrierType)
                        }
                        className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
                      >
                        <option value="OWN_FLEET">Flota propia (asignar repartidor)</option>
                        <option value="EXTERNAL_COURIER">Mensajería externa</option>
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {carrierType === 'OWN_FLEET'
                          ? 'El pedido pasará al mapa de asignación.'
                          : 'El pedido queda listo para despacho, sin asignar repartidor.'}
                      </p>
                    </div>
                  )}
                  <RutaButton
                    type="button"
                    variant="primary"
                    disabled={acting}
                    onClick={() =>
                      void runAction(
                        () =>
                          markReady(
                            orderId,
                            order.delivery_type === 'SHIP' ? carrierType : undefined,
                          ),
                        order.delivery_type !== 'SHIP'
                          ? 'Listo para recogida.'
                          : carrierType === 'OWN_FLEET'
                            ? 'Listo. Asigna un repartidor en el mapa.'
                            : 'Listo para despacho.',
                      )
                    }
                  >
                    {order.delivery_type === 'SHIP'
                      ? 'Marcar listo para despacho'
                      : 'Marcar listo para recogida'}
                  </RutaButton>
                </>
              )}

              {showGoToMap && (
                <Link
                  href="/admin/orders/map"
                  className="flex w-full items-center justify-center rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-500/[0.2] dark:border-sky-400/25 dark:text-sky-300"
                >
                  Ir al mapa de asignación
                </Link>
              )}

              {showApproveCancelRequest && (
                <>
                  <RutaButton
                    type="button"
                    variant="warning"
                    disabled={acting}
                    onClick={() =>
                      void runAction(
                        () => approveCancelRequest(orderId),
                        'Solicitud de cancelación aprobada.',
                      )
                    }
                  >
                    Aprobar cancelación
                  </RutaButton>
                  <RutaButton
                    type="button"
                    variant="neutral"
                    disabled={acting}
                    onClick={() =>
                      void runAction(
                        () => rejectCancelRequest(orderId),
                        'Solicitud de cancelación rechazada.',
                      )
                    }
                  >
                    Rechazar cancelación
                  </RutaButton>
                </>
              )}

              {showCancel && (
                <RutaButton
                  type="button"
                  variant="danger"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() => cancelOrder(orderId), 'Pedido cancelado.')
                  }
                >
                  Cancelar pedido
                </RutaButton>
              )}

              {showInitiateRefundButton && (
                <RutaButton
                  type="button"
                  variant="warning"
                  disabled={acting}
                  onClick={() => setShowRefundForm(true)}
                >
                  Iniciar reembolso
                </RutaButton>
              )}

              {showRefundForm && (
                <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Iniciar reembolso
                  </p>
                  <form onSubmit={(e) => { void handleInitiateRefund(e) }} className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Modalidad
                      </label>
                      <select
                        value={refundModality}
                        onChange={(e) => setRefundModality(e.target.value as RefundModality)}
                        disabled={refundLoading}
                        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                      >
                        <option value="STORE_CREDIT">Crédito en tienda</option>
                        <option value="BANK_REFUND">Devolución bancaria</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Monto (COP)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder={`Total: ${formatCOP(order.total)}`}
                        disabled={refundLoading}
                        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Motivo (opcional)
                      </label>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Ej. Producto no entregado"
                        disabled={refundLoading}
                        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                    {refundError && (
                      <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        {refundError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <RutaButton
                        type="submit"
                        variant="warning"
                        disabled={refundLoading || !refundAmount.trim()}
                      >
                        {refundLoading ? 'Iniciando…' : 'Confirmar reembolso'}
                      </RutaButton>
                      <RutaButton
                        type="button"
                        variant="neutral"
                        disabled={refundLoading}
                        onClick={() => { setShowRefundForm(false); setRefundError(null) }}
                      >
                        Cancelar
                      </RutaButton>
                    </div>
                  </form>
                </div>
              )}

              {!showConfirmCorporate &&
                !showAcceptReject &&
                !showMarkPreparing &&
                !showMarkReady &&
                !showGoToMap &&
                !showApproveCancelRequest &&
                !showCancel &&
                !showInitiateRefundButton &&
                !showRefundForm && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay acciones disponibles para el estado actual.
                  </p>
                )}
            </div>
          </RutaCard>

          {/* Reembolso */}
          {showRefundSection && (
            <RutaCard>
              <RutaSectionHeader title="Reembolso" subtitle="estado del reembolso" />
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Estado</dt>
                  <dd>
                    <RefundStatusBadge status={refundStatus} />
                  </dd>
                </div>
                {order.refund_modality && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Modalidad</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {order.refund_modality === 'STORE_CREDIT' ? 'Crédito en tienda' : 'Devolución bancaria'}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-3">
                <Link
                  href="/admin/refunds"
                  className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Ver lista de reembolsos →
                </Link>
              </div>
            </RutaCard>
          )}

          {order.delivery_type === 'PICKUP' && order.order_status === 'READY_FOR_PICKUP' && (
            <PickupActions
              orderId={order.id}
              isCod={order.payment?.method === 'ON_DELIVERY'}
              onActionComplete={() => { void refetch() }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const REFUND_STATUS_LABELS: Partial<Record<string, string>> = {
  REFUND_NOT_REQUIRED: 'Sin reembolso',
  REFUND_PENDING: 'Pendiente',
  REFUND_PROCESSING: 'En proceso',
  REFUND_PROVIDER_REQUESTED: 'Solicitado a proveedor',
  REFUNDED: 'Reembolsado',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  REFUND_FAILED: 'Fallido',
}

function RefundStatusBadge({ status }: { status: RefundOrderStatus | string }) {
  type Color = 'slate' | 'amber' | 'blue' | 'violet' | 'green' | 'red'
  const colorMap: Record<string, Color> = {
    REFUND_NOT_REQUIRED: 'slate',
    REFUND_PENDING: 'amber',
    REFUND_PROCESSING: 'blue',
    REFUND_PROVIDER_REQUESTED: 'violet',
    REFUNDED: 'green',
    PARTIALLY_REFUNDED: 'green',
    REFUND_FAILED: 'red',
  }
  const colorClasses: Record<Color, string> = {
    slate:  'bg-white/[0.06] text-slate-600 border-slate-200 dark:border-white/10 dark:text-slate-300',
    amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
    blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
    violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
    green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
    red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
  }
  const color: Color = colorMap[status] ?? 'slate'
  return (
    <span className={['inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold', colorClasses[color]].join(' ')}>
      {REFUND_STATUS_LABELS[status] ?? status}
    </span>
  )
}
