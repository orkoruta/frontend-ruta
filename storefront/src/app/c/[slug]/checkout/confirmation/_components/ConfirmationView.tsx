'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RutaButton, RutaCard, RutaPill } from '@orkoruta/ui'
import {
  getBuyerOrder,
  type ApiError,
  type BuyerOrder,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/buyer_orders.api'

type ConfirmationState = 'processing' | 'confirmed' | 'failed' | 'missing-order' | 'error'

const PROCESSING_PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING_ONLINE_PAYMENT',
  'PAYMENT_PROCESSING',
  'PAYMENT_FAILED_RETRYABLE',
]

const FAILED_PAYMENT_STATUSES: PaymentStatus[] = ['PAYMENT_REJECTED_FINAL']

const FAILED_ORDER_STATUSES: OrderStatus[] = [
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SELLER',
  'CANCELLED_BY_SYSTEM',
  'CANCELLED_BY_ADMIN',
  'CANCELLED_NO_PAYMENT',
  'EXPIRED',
  'VALIDATION_REJECTED',
  'CLOSED',
]

const POLL_INTERVAL_MS = 3500
const MAX_POLL_ATTEMPTS = 40

function parseOrderId(value: string | null): number | null {
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value)

  const referenceMatch = value.match(/^RUTA-(\d+)-[A-Za-z0-9]+$/)
  if (referenceMatch?.[1]) return Number(referenceMatch[1])

  return null
}

function resolveOrderId(searchParams: URLSearchParams): number | null {
  return (
    parseOrderId(searchParams.get('order_id')) ??
    parseOrderId(searchParams.get('orderId')) ??
    parseOrderId(searchParams.get('id')) ??
    parseOrderId(searchParams.get('reference')) ??
    parseOrderId(searchParams.get('transaction_id'))
  )
}

function paymentLabel(status?: PaymentStatus): string {
  const labels: Partial<Record<PaymentStatus, string>> = {
    PAYMENT_NOT_STARTED: 'No iniciado',
    PENDING_ONLINE_PAYMENT: 'Pago pendiente',
    PAYMENT_PROCESSING: 'Procesando pago',
    PAID: 'Pagado',
    PAYMENT_FAILED_RETRYABLE: 'Pago fallido, reintentable',
    PAYMENT_REJECTED_FINAL: 'Pago rechazado',
    PENDING_COLLECTION: 'Cobro contra entrega pendiente',
    COLLECTION_PROCESSING: 'Registrando cobro',
    PAYMENT_COLLECTED: 'Cobrado',
    PAYMENT_COLLECTION_FAILED: 'Cobro fallido',
    PAYMENT_NOT_COLLECTED: 'No cobrado',
  }

  return status ? labels[status] ?? status : 'Consultando'
}

function orderLabel(status?: OrderStatus): string {
  const labels: Partial<Record<OrderStatus, string>> = {
    DRAFT: 'Borrador',
    PENDING_CONFIRM: 'Pendiente de confirmación',
    ORDER_SUBMITTED: 'Pedido enviado',
    EXPIRED: 'Expirado',
    ORDER_VALIDATING: 'Validando pedido',
    MANUAL_REVIEW: 'Revisión manual',
    VALIDATION_APPROVED: 'Validado',
    VALIDATION_REJECTED: 'Rechazado',
    SELLER_CONFIRMED: 'Aceptado por vendedor',
    PREPARING: 'Preparando',
    AWAITING_COURIER_ASSIGNMENT: 'Buscando repartidor',
    READY_TO_SHIP: 'Listo para despacho',
    READY_FOR_PICKUP: 'Listo para recogida',
    CANCELLED_BY_CUSTOMER: 'Cancelado por comprador',
    CANCELLED_BY_SELLER: 'Cancelado por vendedor',
    CANCELLED_BY_SYSTEM: 'Cancelado por sistema',
    CANCELLED_BY_ADMIN: 'Cancelado por admin',
    CANCELLED_NO_PAYMENT: 'Cancelado sin pago',
    CLOSED: 'Cerrado',
  }

  return status ? labels[status] ?? status : 'Pendiente'
}

function getConfirmationState(order: BuyerOrder | null, orderId: number | null, error: string | null): ConfirmationState {
  if (!orderId) return 'missing-order'
  if (error && !order) return 'error'
  if (!order) return 'processing'
  if (order.payment_status === 'PAID') return 'confirmed'
  if (
    FAILED_PAYMENT_STATUSES.includes(order.payment_status) ||
    FAILED_ORDER_STATUSES.includes(order.order_status)
  ) {
    return 'failed'
  }
  if (PROCESSING_PAYMENT_STATUSES.includes(order.payment_status)) return 'processing'
  return 'processing'
}

function stateCopy(state: ConfirmationState) {
  switch (state) {
    case 'confirmed':
      return {
        icon: 'OK',
        title: 'Pago confirmado',
        body: 'Recibimos la confirmación de Wompi. Tu pedido seguirá con la validación operativa.',
        tone: 'green',
      }
    case 'failed':
      return {
        icon: '!',
        title: 'Pago no aprobado',
        body: 'Wompi no aprobó el pago o el pedido quedó cerrado. Puedes revisar el detalle del pedido para ver el estado actual.',
        tone: 'red',
      }
    case 'missing-order':
      return {
        icon: '?',
        title: 'No pudimos identificar el pedido',
        body: 'La respuesta de Wompi no trajo una referencia de pedido reconocible. Revisa tus pedidos para confirmar el estado.',
        tone: 'amber',
      }
    case 'error':
      return {
        icon: '!',
        title: 'No pudimos consultar el pago',
        body: 'Hubo un problema al consultar el estado. Intenta de nuevo o revisa tus pedidos.',
        tone: 'red',
      }
    default:
      return {
        icon: '...',
        title: 'Estamos confirmando tu pago',
        body: 'Wompi puede tardar unos segundos en enviar la confirmación. Actualizaremos esta pantalla automáticamente.',
        tone: 'amber',
      }
  }
}

function toneClasses(tone: string): string {
  if (tone === 'green') {
    return 'border-emerald-200 bg-emerald-500/[0.12] text-emerald-700 dark:border-emerald-400/25 dark:text-emerald-300'
  }
  if (tone === 'red') {
    return 'border-rose-200 bg-rose-500/[0.12] text-rose-700 dark:border-rose-400/25 dark:text-rose-300'
  }
  return 'border-amber-200 bg-amber-500/[0.14] text-amber-700 dark:border-amber-400/25 dark:text-amber-300'
}

export default function ConfirmationView() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<BuyerOrder | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const transactionId = searchParams.get('transaction_id')
  const reference = searchParams.get('reference')
  const orderId = useMemo(() => resolveOrderId(searchParams), [searchParams])
  const state = getConfirmationState(order, orderId, error)
  const copy = stateCopy(state)
  const isFinal = state === 'confirmed' || state === 'failed' || state === 'missing-order'

  const loadOrder = useCallback(async () => {
    if (!orderId) return

    try {
      const nextOrder = await getBuyerOrder(orderId)
      setOrder(nextOrder)
      setError(null)
      setAttempts((current) => current + 1)
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message ?? 'No pudimos consultar el estado del pago.')
      setAttempts((current) => current + 1)
    }
  }, [orderId])

  useEffect(() => {
    setOrder(null)
    setAttempts(0)
    setError(null)
  }, [orderId])

  useEffect(() => {
    if (!orderId) return
    loadOrder()
  }, [loadOrder, orderId])

  useEffect(() => {
    if (!orderId || isFinal || attempts >= MAX_POLL_ATTEMPTS) return

    const intervalId = window.setInterval(loadOrder, POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [attempts, isFinal, loadOrder, orderId])

  const statusLine =
    attempts >= MAX_POLL_ATTEMPTS && state === 'processing'
      ? 'La confirmación está tardando más de lo esperado.'
      : paymentLabel(order?.payment_status)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <RutaCard className="px-5 py-8 text-center sm:px-10 sm:py-10">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border text-lg font-black ${toneClasses(copy.tone)}`}
          aria-hidden="true"
        >
          {state === 'processing' ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            copy.icon
          )}
        </div>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Confirmación de pago
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.body}
        </p>

        <div className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-2">
          <div className="rounded-md border border-slate-200/80 bg-slate-50/[0.75] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Estado del pago
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{statusLine}</p>
          </div>
          <div className="rounded-md border border-slate-200/80 bg-slate-50/[0.75] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Estado del pedido
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {orderLabel(order?.order_status)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {orderId ? <RutaPill variant="slate">Pedido #{orderId}</RutaPill> : null}
          {transactionId ? <RutaPill variant="blue">Transacción {transactionId}</RutaPill> : null}
          {reference ? <RutaPill variant="violet">Referencia {reference}</RutaPill> : null}
        </div>

        {error ? (
          <div className="mx-auto mt-5 max-w-xl rounded-md border border-rose-200/80 bg-rose-500/[0.06] px-4 py-3 text-left dark:border-rose-400/20">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {orderId ? (
            <Link href={`/c/${slug}/orders/${orderId}`}>
              <RutaButton variant="primary" size="lg" className="w-full justify-center sm:w-auto">
                Ver mi pedido
              </RutaButton>
            </Link>
          ) : (
            <Link href={`/c/${slug}/orders`}>
              <RutaButton variant="primary" size="lg" className="w-full justify-center sm:w-auto">
                Ver mis pedidos
              </RutaButton>
            </Link>
          )}
          <Link href={`/c/${slug}`}>
            <RutaButton variant="neutral" size="lg" className="w-full justify-center sm:w-auto">
              Seguir comprando
            </RutaButton>
          </Link>
        </div>
      </RutaCard>
    </main>
  )
}
