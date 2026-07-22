'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  courierStatusLabel,
  courierStatusTone,
  type StatusTone,
} from '@/lib/courier_status_labels'
import {
  getCourierOrderById,
  startShipping,
  markOutForDelivery,
  arrive,
  markDelivered,
  attemptFailed,
  type ApiError,
  type CourierOrderDetail as CourierOrderDetailType,
  type CourierOrderStatus,
  formatDeliveryAddress,
  isCollectOnDelivery,
} from '@/lib/courier_orders.api'
import CollectionForm from './CollectionForm'
import { CollectionEvidenceCard } from '@/components/CollectionEvidenceCard'

interface Props {
  orderId: number
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

type StatusColor = StatusTone



const COLOR_BADGE: Record<StatusColor, string> = {
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  slate:  'bg-white/[0.06] text-slate-600 border-white/10 dark:text-slate-300',
  red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}

const TIMELINE_DOT: Record<StatusColor, string> = {
  blue:   'bg-sky-500',
  amber:  'bg-amber-500',
  green:  'bg-emerald-500',
  slate:  'bg-slate-400 dark:bg-slate-500',
  red:    'bg-rose-500',
}

function StatusBadge({ status }: { status: CourierOrderStatus }) {
  const color = courierStatusTone(status)
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold',
        COLOR_BADGE[color],
      ].join(' ')}
    >
      {courierStatusLabel(status)}
    </span>
  )
}

export default function CourierOrderDetail({ orderId }: Props) {
  const [order, setOrder] = useState<CourierOrderDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showFailedDialog, setShowFailedDialog] = useState(false)
  const [failedReason, setFailedReason] = useState('')

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getCourierOrderById(orderId)
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
  }, [orderId])

  async function runAction(fn: () => Promise<CourierOrderDetailType>, msg: string) {
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

  async function submitAttemptFailed() {
    if (!failedReason.trim()) return
    setShowFailedDialog(false)
    await runAction(
      () => attemptFailed(orderId, failedReason.trim()),
      'Intento de entrega registrado.',
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Cargando pedido…
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg">
        <RutaCard>
          <RutaSectionHeader title="Pedido no disponible" subtitle="detalle" />
          {error && (
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          )}
          <Link
            href="/courier"
            className="mt-3 inline-flex items-center text-sm text-sky-600 hover:underline dark:text-sky-400"
          >
            ← Volver
          </Link>
        </RutaCard>
      </div>
    )
  }

  const status = order.order_status
  const isCOD = isCollectOnDelivery(order.payment_method)

  const showStartShipping = status === 'COURIER_ASSIGNED'
  const showMarkOutForDelivery = status === 'SHIPPED' || status === 'IN_TRANSIT'
  const showArrive = status === 'OUT_FOR_DELIVERY'
  const showCollection = status === 'ARRIVED_AT_CUSTOMER' && isCOD && !order.collection_recorded
  const showMarkDelivered = status === 'ARRIVED_AT_CUSTOMER' && (!isCOD || order.collection_recorded)
  const showAttemptFailed = status === 'OUT_FOR_DELIVERY'

  // Con coordenadas el enlace lleva al punto exacto; el texto de la dirección
  // es un último recurso, porque la nomenclatura colombiana se resuelve mal.
  const address = order.delivery_address
  const hasCoords = address?.latitude != null && address?.longitude != null
  const addressQuery = encodeURIComponent(formatDeliveryAddress(address))

  const mapsUrl = hasCoords
    ? `https://maps.google.com?q=${address.latitude},${address.longitude}`
    : `https://maps.google.com?q=${addressQuery}`

  // `waze.com/ul` abre la app si está instalada y cae a la web si no; con
  // `navigate=yes` arranca la ruta sin un toque extra.
  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`
    : `https://waze.com/ul?q=${addressQuery}&navigate=yes`

  // El historial mezcla dimensiones (order_status, payment_status…); aquí solo
  // interesa el avance del pedido. `?? []` porque un pedido recién creado puede
  // no tener entradas todavía.
  const sortedHistory = [...(order.history ?? [])]
    .filter((entry) => entry.state_dimension === 'order_status')
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/courier"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] text-slate-600 dark:border-white/10 dark:text-slate-300"
        >
          ←
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            pedido #{order.id}
          </p>
          <StatusBadge status={status} />
        </div>
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

      {/* Buyer */}
      <RutaCard>
        <RutaSectionHeader title="Comprador" subtitle="contacto" />
        <div className="mt-2 space-y-2">
          {/* Encadenado opcional a propósito: el repartidor está en la calle y
              un campo que falte no puede tumbarle la pantalla entera. */}
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {order.buyer?.name ?? 'Sin datos del comprador'}
          </p>
          {order.buyer?.phone && (
            <a
              href={`tel:${order.buyer.phone}`}
              className="flex min-h-[48px] items-center gap-2 rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 text-sm font-semibold text-sky-700 dark:border-sky-400/25 dark:text-sky-300"
            >
              📞 {order.buyer.phone}
            </a>
          )}
        </div>
      </RutaCard>

      {/* Address */}
      <RutaCard>
        <RutaSectionHeader title="Dirección de entrega" subtitle="destino" />
        <p className="mt-2 text-base text-slate-800 dark:text-slate-200">
          {formatDeliveryAddress(address)}
        </p>
        {address?.instructions && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {address.instructions}
          </p>
        )}
        {/* Dos navegadores: cada repartidor usa el que prefiere, y Waze suele
            ir mejor con el tráfico de Bogotá. */}
        <div className="mt-3 flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-4 text-sm font-semibold text-violet-700 dark:border-violet-400/25 dark:text-violet-300"
          >
            🗺 Google Maps
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 text-sm font-semibold text-sky-700 dark:border-sky-400/25 dark:text-sky-300"
          >
            🚗 Waze
          </a>
        </div>
      </RutaCard>

      {/* Items */}
      <RutaCard>
        <RutaSectionHeader title="Items del pedido" subtitle="resumen" />
        <div className="mt-2 divide-y divide-slate-200/70 dark:divide-white/10">
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between py-2.5">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.quantity}× {item.product_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCOP(item.unit_price)} c/u
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCOP(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-white/10">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">
            {formatCOP(order.total)}
          </span>
        </div>
        {isCOD && (
          <div className="mt-2 rounded-md border border-amber-400/25 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Cobro contra entrega — monto a recibir: <strong>{formatCOP(order.total)}</strong>
          </div>
        )}
      </RutaCard>

      {/* Timeline */}
      {sortedHistory.length > 0 && (
        <RutaCard>
          <RutaSectionHeader title="Historial" subtitle="estados" />
          <div className="mt-2">
            {sortedHistory.map((entry, idx) => {
              const color = courierStatusTone(entry.new_value as CourierOrderStatus)
              return (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'mt-1 h-3 w-3 flex-shrink-0 rounded-full',
                        TIMELINE_DOT[color],
                      ].join(' ')}
                    />
                    {idx < sortedHistory.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {courierStatusLabel(entry.new_value as CourierOrderStatus)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {new Intl.DateTimeFormat('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(entry.occurred_at))}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </RutaCard>
      )}

      {/* Foto del recibo: la tarjeta se oculta sola si el pedido no tiene cobro. */}
      <CollectionEvidenceCard orderId={orderId} scope="courier" />

      {/* Collection form (COD + ARRIVED_AT_CUSTOMER) */}
      {showCollection && (
        <CollectionForm
          orderId={orderId}
          totalDue={order.total}
          onSuccess={(updated) => {
            setOrder(updated)
            setSuccess('Cobro registrado correctamente.')
          }}
        />
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {showStartShipping && (
          <RutaButton
            type="button"
            variant="primary"
            disabled={acting}
            className="min-h-[52px] w-full justify-center text-base"
            onClick={() => void runAction(() => startShipping(orderId), 'Envío iniciado.')}
          >
            Iniciar despacho
          </RutaButton>
        )}

        {showMarkOutForDelivery && (
          <RutaButton
            type="button"
            variant="primary"
            disabled={acting}
            className="min-h-[52px] w-full justify-center text-base"
            onClick={() => void runAction(() => markOutForDelivery(orderId), 'Marcado en camino.')}
          >
            Marcar en camino al cliente
          </RutaButton>
        )}

        {showArrive && (
          <RutaButton
            type="button"
            variant="primary"
            disabled={acting}
            className="min-h-[52px] w-full justify-center text-base"
            onClick={() => void runAction(() => arrive(orderId), 'Llegada registrada.')}
          >
            Llegué al cliente
          </RutaButton>
        )}

        {showMarkDelivered && (
          <RutaButton
            type="button"
            variant="success"
            disabled={acting}
            className="min-h-[52px] w-full justify-center text-base"
            onClick={() => void runAction(() => markDelivered(orderId), 'Pedido entregado.')}
          >
            Marcar como entregado
          </RutaButton>
        )}

        {showAttemptFailed && (
          <>
            <RutaButton
              type="button"
              variant="warning"
              disabled={acting}
              className="min-h-[52px] w-full justify-center text-base"
              onClick={() => setShowFailedDialog(true)}
            >
              Registrar intento fallido
            </RutaButton>

            {showFailedDialog && (
              <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.08] p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  ¿Por qué no fue posible entregar?
                </p>
                <textarea
                  value={failedReason}
                  onChange={(e) => setFailedReason(e.target.value)}
                  rows={3}
                  placeholder="Ej: cliente no respondió, dirección incorrecta…"
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <RutaButton
                    type="button"
                    variant="warning"
                    disabled={!failedReason.trim() || acting}
                    className="flex-1 justify-center"
                    onClick={() => void submitAttemptFailed()}
                  >
                    Confirmar
                  </RutaButton>
                  <RutaButton
                    type="button"
                    variant="neutral"
                    onClick={() => { setShowFailedDialog(false); setFailedReason('') }}
                  >
                    Cancelar
                  </RutaButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
