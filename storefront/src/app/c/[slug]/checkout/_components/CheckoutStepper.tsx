'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { CartApiError, getDraftOrder, type DraftOrder } from '@/lib/cart.api'
import AddressStep from './AddressStep'
import DeliveryStep from './DeliveryStep'
import PaymentStep from './PaymentStep'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type DeliveryType = 'SHIP' | 'PICKUP'
export type PaymentMethod = 'ONLINE_AT_ORDER' | 'ELECTRONIC_ON_DELIVERY' | 'CASH_ON_DELIVERY'
export type PaymentSubmethod = 'DATAFONO' | 'BANK_TRANSFER' | 'PAYMENT_LINK' | 'QR' | null

export interface DeliveryAddress {
  line: string
  city: string
  state: string
  country: 'CO'
  postal_code: string
  latitude?: number
  longitude?: number
  instructions: string
}

export interface PickupPoint {
  id: number
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
}

interface ApiErrorBody {
  code?: string
  message?: string
  details?: unknown
}

interface InitiatePaymentResponse {
  order_id: number
  payment_status: string
  wompi_checkout_url: string
  wompi_reference: string
}

const pickupPoints: PickupPoint[] = [
  {
    id: 1,
    name: 'Punto Norte',
    address: 'Cra 15 # 93 - 47',
    city: 'Bogotá',
    latitude: 4.6767,
    longitude: -74.0486,
  },
  {
    id: 2,
    name: 'Punto Centro',
    address: 'Calle 19 # 7 - 43',
    city: 'Bogotá',
    latitude: 4.6097,
    longitude: -74.0714,
  },
]

const initialAddress: DeliveryAddress = {
  line: '',
  city: 'Bogotá',
  state: 'Bogotá D.C.',
  country: 'CO',
  postal_code: '',
  latitude: 4.7109,
  longitude: -74.0721,
  instructions: '',
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function parseApiError(res: Response): Promise<Error> {
  let body: ApiErrorBody | undefined
  try {
    body = (await res.json()) as ApiErrorBody
  } catch {
    // empty body
  }
  return new Error(body?.message ?? `Error ${res.status}`)
}

async function confirmOrder(orderId: number, payload: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw await parseApiError(res)
}

async function initiatePayment(orderId: number): Promise<InitiatePaymentResponse> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}/initiate-payment`, {
    method: 'POST',
    headers: {
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
  })

  if (!res.ok) throw await parseApiError(res)
  return res.json() as Promise<InitiatePaymentResponse>
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-48 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <RutaCard key={item}>
              <div className="h-28 rounded-md bg-slate-200 dark:bg-slate-700" />
            </RutaCard>
          ))}
        </div>
        <RutaCard>
          <div className="h-52 rounded-md bg-slate-200 dark:bg-slate-700" />
        </RutaCard>
      </div>
    </div>
  )
}

export default function CheckoutStepper() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<DraftOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('SHIP')
  const [address, setAddress] = useState<DeliveryAddress>(initialAddress)
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<number | null>(
    pickupPoints[0]?.id ?? null,
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE_AT_ORDER')
  const [paymentSubmethod, setPaymentSubmethod] = useState<PaymentSubmethod>('DATAFONO')

  const loadDraftOrder = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const draft = await getDraftOrder()
      setOrder(draft)
    } catch (err) {
      if (err instanceof CartApiError && err.status === 401) {
        router.push(`/c/${slug}/login?return=/c/${slug}/checkout`)
        return
      }
      setError('No pudimos cargar el checkout. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [router, slug])

  useEffect(() => {
    loadDraftOrder()
  }, [loadDraftOrder])

  useEffect(() => {
    if (paymentMethod === 'ELECTRONIC_ON_DELIVERY' && !paymentSubmethod) {
      setPaymentSubmethod('DATAFONO')
    }
    if (paymentMethod !== 'ELECTRONIC_ON_DELIVERY' && paymentSubmethod) {
      setPaymentSubmethod(null)
    }
  }, [paymentMethod, paymentSubmethod])

  const validationMessage = useMemo(() => {
    if (!order || order.items.length === 0) return 'Tu carrito está vacío.'
    if (order.items.some((item) => item.stock_quantity === 0)) {
      return 'Hay productos sin stock en el carrito.'
    }
    if (deliveryType === 'SHIP') {
      if (!address.line.trim() || !address.city.trim() || !address.state.trim()) {
        return 'Completa la dirección de entrega.'
      }
    }
    if (deliveryType === 'PICKUP' && !selectedPickupPointId) {
      return 'Selecciona un punto físico.'
    }
    if (paymentMethod === 'ELECTRONIC_ON_DELIVERY' && !paymentSubmethod) {
      return 'Selecciona el submétodo de pago electrónico.'
    }
    return null
  }, [address, deliveryType, order, paymentMethod, paymentSubmethod, selectedPickupPointId])

  const handleSubmit = async () => {
    if (!order || validationMessage || submitting || !slug) return

    setSubmitting(true)
    setError(null)

    const payload =
      deliveryType === 'SHIP'
        ? {
            delivery_type: deliveryType,
            delivery_address: {
              line: address.line.trim(),
              city: address.city.trim(),
              state: address.state.trim(),
              country: address.country,
              postal_code: address.postal_code.trim() || undefined,
              latitude: address.latitude,
              longitude: address.longitude,
              instructions: address.instructions.trim() || undefined,
            },
            payment_method: paymentMethod,
            payment_method_submethod:
              paymentMethod === 'ELECTRONIC_ON_DELIVERY' ? paymentSubmethod : undefined,
          }
        : {
            delivery_type: deliveryType,
            pickup_point_id: selectedPickupPointId,
            payment_method: paymentMethod,
            payment_method_submethod:
              paymentMethod === 'ELECTRONIC_ON_DELIVERY' ? paymentSubmethod : undefined,
          }

    try {
      await confirmOrder(order.id, payload)

      if (paymentMethod === 'ONLINE_AT_ORDER') {
        const payment = await initiatePayment(order.id)
        window.location.assign(payment.wompi_checkout_url)
        return
      }

      router.push(`/c/${slug}/orders/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos confirmar el pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <CheckoutSkeleton />

  if (error && !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <RutaButton variant="neutral" onClick={loadDraftOrder}>
            Reintentar
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  if (!order || order.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-12">
          <h1 className="mb-2 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            No hay pedido en borrador
          </h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Agrega productos al carrito antes de continuar con el checkout.
          </p>
          <Link href={`/c/${slug}/cart`}>
            <RutaButton variant="primary" className="justify-center">
              Volver al carrito
            </RutaButton>
          </Link>
        </RutaCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Checkout
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Confirmar pedido
          </h1>
        </div>
        <RutaPill variant="slate">Pedido DRAFT #{order.id}</RutaPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <DeliveryStep value={deliveryType} onChange={setDeliveryType} />
          <AddressStep
            deliveryType={deliveryType}
            address={address}
            pickupPoints={pickupPoints}
            selectedPickupPointId={selectedPickupPointId}
            onAddressChange={setAddress}
            onPickupPointChange={setSelectedPickupPointId}
          />
          <PaymentStep
            paymentMethod={paymentMethod}
            paymentSubmethod={paymentSubmethod}
            onPaymentMethodChange={setPaymentMethod}
            onPaymentSubmethodChange={setPaymentSubmethod}
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <RutaCard>
            <RutaSectionHeader title="Resumen del pedido" subtitle="total" />
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-white/[0.06]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.product_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.quantity} x {formatCOP(item.unit_price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatCOP(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCOP(order.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Envío</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Por calcular
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Total
                </span>
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {formatCOP(order.total)}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-rose-200/80 bg-rose-500/[0.06] px-3 py-2 dark:border-rose-400/20">
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
              </div>
            )}

            {validationMessage && (
              <div className="mt-4 rounded-md border border-amber-200/80 bg-amber-500/[0.10] px-3 py-2 dark:border-amber-400/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  {validationMessage}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <RutaButton
                variant="success"
                size="lg"
                disabled={Boolean(validationMessage) || submitting}
                onClick={handleSubmit}
                className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
                title={validationMessage ?? undefined}
              >
                {submitting ? 'Confirmando...' : 'Confirmar pedido'}
              </RutaButton>
              <Link href={`/c/${slug}/cart`} className="w-full">
                <RutaButton variant="neutral" className="w-full justify-center">
                  Volver al carrito
                </RutaButton>
              </Link>
            </div>
          </RutaCard>
        </aside>
      </div>
    </div>
  )
}
