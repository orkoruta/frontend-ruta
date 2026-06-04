'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  cancelBuyerOrder,
  confirmBuyerOrderReceipt,
  getBuyerOrder,
  getBuyerOrderRefund,
  requestBuyerOrderCancel,
  type ApiError,
  type BuyerOrder,
  type BuyerOrderHistoryEntry,
  type BuyerOrderRefundResponse,
  type OrderStatus,
  type PaymentStatus,
  type RefundStatus,
} from '@/lib/buyer_orders.api'
import { requestReturn, type ReturnStatus, type ReturnMechanism } from '@/lib/returns.api'
import { openDispute, type DisputeStatus } from '@/lib/disputes.api'

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

const REFUND_STATUSES_VISIBLE: RefundStatus[] = [
  'REFUND_PENDING',
  'REFUND_PROCESSING',
  'REFUND_PROVIDER_REQUESTED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'REFUND_FAILED',
]

function refundStatusLabel(status: RefundStatus): string {
  const labels: Record<RefundStatus, string> = {
    REFUND_NOT_REQUIRED: '',
    REFUND_PENDING: 'Pendiente',
    REFUND_PROCESSING: 'En proceso',
    REFUND_PROVIDER_REQUESTED: 'Solicitado al banco',
    REFUNDED: 'Completado',
    PARTIALLY_REFUNDED: 'Parcial',
    REFUND_FAILED: 'Fallido',
  }
  return labels[status] ?? status
}

function refundStatusMessage(status: RefundStatus): string {
  const messages: Record<RefundStatus, string> = {
    REFUND_NOT_REQUIRED: '',
    REFUND_PENDING: 'Tu reembolso está pendiente de procesamiento',
    REFUND_PROCESSING: 'Tu reembolso está siendo procesado',
    REFUND_PROVIDER_REQUESTED: 'Tu reembolso fue solicitado a tu banco',
    REFUNDED: 'Tu reembolso fue completado exitosamente',
    PARTIALLY_REFUNDED: 'Tu reembolso fue completado parcialmente',
    REFUND_FAILED: 'Hubo un problema con tu reembolso — contacta al vendedor',
  }
  return messages[status] ?? ''
}

function refundModalityLabel(modality: string | null): string {
  if (modality === 'STORE_CREDIT') return 'Crédito interno'
  if (modality === 'BANK_REFUND') return 'Devolución bancaria'
  return modality ?? '—'
}

function refundStatusColor(status: RefundStatus): StatusColor {
  if (status === 'REFUND_FAILED') return 'red'
  if (status === 'REFUNDED') return 'green'
  if (status === 'PARTIALLY_REFUNDED') return 'amber'
  if (status === 'REFUND_PROVIDER_REQUESTED' || status === 'REFUND_PROCESSING') return 'blue'
  return 'slate'
}

type ReturnStatusType = ReturnStatus

function returnStatusLabel(status: ReturnStatusType): string {
  const labels: Partial<Record<ReturnStatusType, string>> = {
    RETURN_REQUESTED: 'Solicitud enviada',
    RETURN_UNDER_REVIEW: 'En revisión',
    RETURN_APPROVED: 'Aprobada',
    RETURN_REJECTED: 'Rechazada',
    CUSTOMER_RETURN_IN_TRANSIT: 'En tránsito',
    RETURN_RECEIVED: 'Recibida',
    PICKUP_SCHEDULED: 'Recogida agendada',
    PICKUP_COLLECTED: 'Recogido',
    RETURN_CANCELLED: 'Cancelada',
    RETURN_LOST: 'Perdida',
  }
  return labels[status] ?? status
}

function returnStatusColor(status: ReturnStatusType): StatusColor {
  if (status === 'RETURN_REJECTED' || status === 'RETURN_LOST') return 'red'
  if (status === 'RETURN_RECEIVED') return 'green'
  if (status === 'RETURN_REQUESTED' || status === 'RETURN_UNDER_REVIEW') return 'amber'
  if (status === 'RETURN_APPROVED' || status === 'PICKUP_SCHEDULED' || status === 'CUSTOMER_RETURN_IN_TRANSIT') return 'blue'
  return 'slate'
}

function returnStatusMessage(status: ReturnStatusType, mechanism?: ReturnMechanism | null): string {
  const messages: Partial<Record<ReturnStatusType, string>> = {
    RETURN_REQUESTED: 'Tu solicitud de devolución fue enviada. El vendedor la revisará pronto.',
    RETURN_UNDER_REVIEW: 'El vendedor está revisando tu solicitud.',
    RETURN_APPROVED: mechanism === 'BUYER_SHIPS_VIA_COURIER'
      ? 'Tu devolución fue aprobada. Por favor envía el producto al vendedor.'
      : 'Tu devolución fue aprobada. El vendedor coordinará la recogida.',
    RETURN_REJECTED: 'Tu solicitud de devolución fue rechazada.',
    CUSTOMER_RETURN_IN_TRANSIT: 'El producto está en camino al vendedor.',
    RETURN_RECEIVED: 'El vendedor recibió tu devolución. El proceso de reembolso continúa.',
    PICKUP_SCHEDULED: 'Se ha agendado la recogida del producto.',
    PICKUP_COLLECTED: 'El repartidor recogió el producto.',
    RETURN_CANCELLED: 'La devolución fue cancelada.',
    RETURN_LOST: 'El producto se perdió durante la devolución.',
  }
  return messages[status] ?? 'Tu devolución está en proceso.'
}

const RETURN_REASONS = [
  'Producto dañado',
  'Producto incorrecto',
  'No era lo esperado',
  'Producto defectuoso',
  'Otro',
]

const DISPUTE_ELIGIBLE_STATUSES: OrderStatus[] = [
  'DELIVERED',
  'CONFIRMED_BY_CUSTOMER',
  'CONFIRMED_BY_SYSTEM',
  'COMPLETED_SUCCESSFULLY',
]

function disputeStatusLabel(status: DisputeStatus): string {
  const labels: Record<DisputeStatus, string> = {
    DISPUTED: 'Disputa abierta',
    DISPUTE_UNDER_REVIEW: 'En revisión',
    DISPUTE_RESOLVED_NO_ACTION: 'Cerrada sin acción',
    DISPUTE_RESOLVED_WITH_RETURN: 'Resuelta con devolución',
    DISPUTE_RESOLVED_WITH_REFUND: 'Resuelta con reembolso',
  }
  return labels[status] ?? status
}

function disputeStatusColor(status: DisputeStatus): StatusColor {
  if (status === 'DISPUTED') return 'amber'
  if (status === 'DISPUTE_UNDER_REVIEW') return 'blue'
  if (status === 'DISPUTE_RESOLVED_WITH_RETURN' || status === 'DISPUTE_RESOLVED_WITH_REFUND') return 'green'
  return 'slate'
}

function disputeStatusMessage(status: DisputeStatus): string {
  const messages: Record<DisputeStatus, string> = {
    DISPUTED: 'Tu disputa fue recibida',
    DISPUTE_UNDER_REVIEW: 'El vendedor está revisando tu disputa',
    DISPUTE_RESOLVED_NO_ACTION: 'Tu disputa fue cerrada sin acción',
    DISPUTE_RESOLVED_WITH_RETURN: 'Tu disputa fue resuelta con una devolución',
    DISPUTE_RESOLVED_WITH_REFUND: 'Tu disputa fue resuelta con un reembolso',
  }
  return messages[status] ?? ''
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
  const [refundData, setRefundData] = useState<BuyerOrderRefundResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [actionKind, setActionKind] = useState<ActionKind | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0])
  const [returnComplaint, setReturnComplaint] = useState('')
  const [returnActing, setReturnActing] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [returnSuccess, setReturnSuccess] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeActing, setDisputeActing] = useState(false)
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [disputeSuccess, setDisputeSuccess] = useState(false)

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
      if (REFUND_STATUSES_VISIBLE.includes(result.refund_status)) {
        try {
          const refund = await getBuyerOrderRefund(orderId)
          setRefundData(refund)
        } catch {
          // Refund detail is optional — don't block the order view if it fails
        }
      }
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

  const activeReturnStatus = order?.return_status ?? null
  const activeReturnMechanism = order?.return_mechanism ?? null
  const canRequestReturn =
    order?.order_status === 'CLOSED' &&
    !activeReturnStatus &&
    !returnSuccess

  const activeDisputeStatus = order?.dispute_status ?? null
  const canOpenDispute =
    DISPUTE_ELIGIBLE_STATUSES.includes(order?.order_status as OrderStatus) &&
    !activeDisputeStatus &&
    !disputeSuccess

  async function runRequestReturn() {
    if (!order) return
    setReturnActing(true)
    setReturnError(null)
    try {
      await requestReturn(order.id, { reason: returnReason, buyer_complaint: returnComplaint || undefined })
      setReturnSuccess(true)
      setShowReturnForm(false)
    } catch {
      setReturnError('No se pudo enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setReturnActing(false)
    }
  }

  async function runOpenDispute() {
    if (!order) return
    if (disputeReason.trim().length === 0) {
      setDisputeError('Escribe una razón para continuar.')
      return
    }
    setDisputeActing(true)
    setDisputeError(null)
    try {
      await openDispute(String(order.id), { reason: disputeReason.trim() })
      setDisputeSuccess(true)
      setShowDisputeForm(false)
    } catch {
      setDisputeError('No se pudo registrar la disputa. Inténtalo de nuevo.')
    } finally {
      setDisputeActing(false)
    }
  }

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

          {REFUND_STATUSES_VISIBLE.includes(order.refund_status) && (
            <RutaCard>
              <RutaSectionHeader title="Reembolso" subtitle="estado de tu devolución" />
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Estado
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <RutaPill variant={refundStatusColor(order.refund_status)}>
                      {refundStatusLabel(order.refund_status)}
                    </RutaPill>
                  </dd>
                </div>
                {refundData?.refund_modality && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Modalidad
                    </dt>
                    <dd className="mt-1 text-slate-700 dark:text-slate-300">
                      {refundModalityLabel(refundData.refund_modality)}
                    </dd>
                  </div>
                )}
                {refundData?.refund?.amount != null && (
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Monto
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {formatCOP(refundData.refund.amount)}
                    </dd>
                  </div>
                )}
                <div>
                  <p
                    className={[
                      'rounded-md border px-3 py-2 text-xs',
                      order.refund_status === 'REFUND_FAILED'
                        ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
                        : order.refund_status === 'REFUNDED'
                          ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300'
                          : 'border-sky-400/25 bg-sky-500/[0.10] text-sky-700 dark:text-sky-300',
                    ].join(' ')}
                  >
                    {refundStatusMessage(order.refund_status)}
                  </p>
                </div>
              </dl>
            </RutaCard>
          )}

          {activeReturnStatus && (
            <RutaCard>
              <RutaSectionHeader title="Devolución" subtitle="estado de tu solicitud" />
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Estado
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <RutaPill variant={returnStatusColor(activeReturnStatus)}>
                      {returnStatusLabel(activeReturnStatus)}
                    </RutaPill>
                  </dd>
                </div>
                <div>
                  <p
                    className={[
                      'rounded-md border px-3 py-2 text-xs',
                      activeReturnStatus === 'RETURN_REJECTED' || activeReturnStatus === 'RETURN_LOST'
                        ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
                        : activeReturnStatus === 'RETURN_RECEIVED'
                          ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300'
                          : activeReturnStatus === 'RETURN_REQUESTED' || activeReturnStatus === 'RETURN_UNDER_REVIEW'
                            ? 'border-amber-400/25 bg-amber-500/[0.10] text-amber-700 dark:text-amber-300'
                            : 'border-sky-400/25 bg-sky-500/[0.10] text-sky-700 dark:text-sky-300',
                    ].join(' ')}
                  >
                    {returnStatusMessage(activeReturnStatus, activeReturnMechanism)}
                  </p>
                </div>
              </dl>
            </RutaCard>
          )}

          {returnSuccess && (
            <p role="status" className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Devolución solicitada. El vendedor revisará tu solicitud.
            </p>
          )}

          {canRequestReturn && !returnSuccess && (
            <RutaCard>
              <RutaSectionHeader title="Solicitar devolución" subtitle="disponible para pedidos entregados" />
              <div className="mt-3">
                {!showReturnForm ? (
                  <RutaButton variant="secondary" className="w-full justify-center" onClick={() => setShowReturnForm(true)}>
                    Solicitar devolución
                  </RutaButton>
                ) : (
                  <div className="flex flex-col gap-3">
                    {returnError && (
                      <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        {returnError}
                      </p>
                    )}
                    <div>
                      <label htmlFor="return-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Razón</label>
                      <select id="return-reason" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} disabled={returnActing}
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white/[0.8] px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-white/10 dark:bg-[#111214] dark:text-slate-100">
                        {RETURN_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="return-complaint" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Descripción (opcional)</label>
                      <textarea id="return-complaint" value={returnComplaint} onChange={(e) => setReturnComplaint(e.target.value)} rows={3} disabled={returnActing}
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white/[0.8] px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-white/10 dark:bg-[#111214] dark:text-slate-100"
                        placeholder="Cuéntanos más detalles sobre el problema." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <RutaButton variant="neutral" onClick={() => { setShowReturnForm(false); setReturnError(null) }} disabled={returnActing}>Cerrar</RutaButton>
                      <RutaButton variant="primary" onClick={runRequestReturn} disabled={returnActing}>{returnActing ? 'Enviando...' : 'Enviar'}</RutaButton>
                    </div>
                  </div>
                )}
              </div>
            </RutaCard>
          )}

          {activeDisputeStatus && (
            <RutaCard>
              <RutaSectionHeader title="Disputa" subtitle="estado de tu reclamación" />
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Estado
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <RutaPill variant={disputeStatusColor(activeDisputeStatus)}>
                      {disputeStatusLabel(activeDisputeStatus)}
                    </RutaPill>
                  </dd>
                </div>
                <div>
                  <p
                    className={[
                      'rounded-md border px-3 py-2 text-xs',
                      activeDisputeStatus === 'DISPUTED'
                        ? 'border-amber-400/25 bg-amber-500/[0.10] text-amber-700 dark:text-amber-300'
                        : activeDisputeStatus === 'DISPUTE_UNDER_REVIEW'
                          ? 'border-sky-400/25 bg-sky-500/[0.10] text-sky-700 dark:text-sky-300'
                          : activeDisputeStatus === 'DISPUTE_RESOLVED_WITH_RETURN' || activeDisputeStatus === 'DISPUTE_RESOLVED_WITH_REFUND'
                            ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200/80 bg-slate-500/[0.08] text-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {disputeStatusMessage(activeDisputeStatus)}
                  </p>
                </div>
              </dl>
            </RutaCard>
          )}

          {disputeSuccess && (
            <p role="status" className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Tu disputa fue registrada
            </p>
          )}

          {canOpenDispute && (
            <RutaCard>
              <RutaSectionHeader title="Abrir disputa" subtitle="para pedidos entregados" />
              <div className="mt-3">
                {!showDisputeForm ? (
                  <RutaButton variant="secondary" className="w-full justify-center" onClick={() => setShowDisputeForm(true)}>
                    Abrir disputa
                  </RutaButton>
                ) : (
                  <div className="flex flex-col gap-3">
                    {disputeError && (
                      <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        {disputeError}
                      </p>
                    )}
                    <div>
                      <label htmlFor="dispute-reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Razón</label>
                      <textarea
                        id="dispute-reason"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={3}
                        disabled={disputeActing}
                        className="mt-2 w-full rounded-md border border-slate-200 bg-white/[0.8] px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-sky-400 dark:border-white/10 dark:bg-[#111214] dark:text-slate-100"
                        placeholder="Cuéntanos el motivo de tu disputa."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <RutaButton variant="neutral" onClick={() => { setShowDisputeForm(false); setDisputeError(null) }} disabled={disputeActing}>Cerrar</RutaButton>
                      <RutaButton variant="primary" onClick={runOpenDispute} disabled={disputeActing}>{disputeActing ? 'Enviando...' : 'Enviar'}</RutaButton>
                    </div>
                  </div>
                )}
              </div>
            </RutaCard>
          )}

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
