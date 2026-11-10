'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  RutaButton,
  RutaCard,
  RutaSectionHeader,
  RutaEmptyState,
  IllustrationEmptyMap,
} from '@orkoruta/ui'
import { isAssigned, type MapOrder } from '@/lib/assignment.api'
import { formatDeliveryDateShort } from '@orkoruta/web-shared'
import { orderColor, type CourierSwatch } from './map_legend'

interface OrdersPanelProps {
  /** Pedidos ya filtrados por el selector de estado y el de fecha. */
  orders: MapOrder[]
  selectedOrderId: number | null
  swatches: Map<number, CourierSwatch>
  /** Pedido con una acción en curso: sus botones se deshabilitan. */
  busyOrderId: number | null
  onSelectOrder: (orderId: number) => void
  onRequestAssign: (order: MapOrder) => void
  onUnassign: (order: MapOrder) => void
  onCancel: (order: MapOrder) => void
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    timeStyle: 'short',
    dateStyle: 'short',
  }).format(new Date(value))
}

/**
 * Estados del mapa desde los que el pedido se puede cancelar desde aquí. Un
 * asignado que ya salió (en camino) no: eso pasa por el detalle y su flujo de
 * retención. El backend es quien manda; esto solo decide si se ofrece.
 */
const CANCELLABLE_FROM_MAP = new Set(['AWAITING_COURIER_ASSIGNMENT', 'COURIER_ASSIGNED'])

/**
 * Fila de pedido. Sin repartidor: asignar. Con repartidor y aún sin salir:
 * quitarlo. En ambos casos se puede abrir el detalle (para ver qué pidió, las
 * indicaciones del cliente o cambiar la fecha) y cancelarlo.
 */
function OrderRow({
  order,
  isSelected,
  swatches,
  busy,
  onSelect,
  onRequestAssign,
  onUnassign,
  onCancel,
}: {
  order: MapOrder
  isSelected: boolean
  swatches: Map<number, CourierSwatch>
  busy: boolean
  onSelect: (orderId: number) => void
  onRequestAssign: (order: MapOrder) => void
  onUnassign: (order: MapOrder) => void
  onCancel: (order: MapOrder) => void
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const assigned = isAssigned(order)
  const canUnassign = order.order_status === 'COURIER_ASSIGNED'
  const canCancel = CANCELLABLE_FROM_MAP.has(order.order_status)

  // El punto replica el color del pin en el mapa, para poder emparejar la fila
  // con el pin sin tener que leer el número de pedido.
  const dotColor = orderColor(order, isSelected, swatches)
  const scheduled = formatDeliveryDateShort(order.scheduled_delivery_date)

  return (
    <li
      className={[
        'u-nudge px-4 py-3 transition-colors',
        isSelected
          ? 'bg-brand-500/[0.08] dark:bg-brand-500/[0.12]'
          : 'hover:bg-slate-50/[0.5] dark:hover:bg-white/[0.025]',
      ].join(' ')}
    >
      {/* Los botones de acción no pueden ir dentro del de seleccionar: son
          hermanos, no anidados. */}
      <button
        type="button"
        onClick={() => onSelect(order.id)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: dotColor }}
            />
            #{order.id}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {order.delivery_address_line}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {order.delivery_address_city}
          </p>
          {order.courier_name && (
            <p className="mt-0.5 truncate text-xs font-semibold" style={{ color: dotColor }}>
              🛵 {order.courier_name}
            </p>
          )}
          {scheduled && (
            <p className="mt-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
              📅 {scheduled}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCOP(order.total)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {formatTime(order.created_at)}
          </p>
        </div>
      </button>

      {confirmingCancel ? (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2 py-1.5">
          <span className="mr-auto text-xs text-rose-700 dark:text-rose-300">
            ¿Cancelar el pedido #{order.id}?
          </span>
          <RutaButton
            type="button"
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() => {
              setConfirmingCancel(false)
              onCancel(order)
            }}
          >
            Sí, cancelar
          </RutaButton>
          <RutaButton type="button" variant="neutral" size="sm" onClick={() => setConfirmingCancel(false)}>
            No
          </RutaButton>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="mr-auto text-xs font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
          >
            Ver / modificar
          </Link>
          {canCancel && (
            <RutaButton
              type="button"
              variant="neutral"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancelar
            </RutaButton>
          )}
          {canUnassign && (
            <RutaButton
              type="button"
              variant="warning"
              size="sm"
              disabled={busy}
              onClick={() => onUnassign(order)}
            >
              Quitar repartidor
            </RutaButton>
          )}
          {!assigned && (
            <RutaButton
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => onRequestAssign(order)}
            >
              Asignar
            </RutaButton>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Panel lateral del mapa: un solo rectángulo con los pedidos que pasan los
 * filtros. El color del punto es el del repartidor que lo lleva (o índigo si
 * aún no tiene), el mismo que el pin en el mapa.
 */
export function OrdersPanel({
  orders,
  selectedOrderId,
  swatches,
  busyOrderId,
  onSelectOrder,
  onRequestAssign,
  onUnassign,
  onCancel,
}: OrdersPanelProps) {
  const pendingCount = orders.filter((o) => !isAssigned(o)).length

  return (
    <RutaCard className="flex h-full flex-col overflow-hidden p-0">
      <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
        <RutaSectionHeader
          title="Pedidos"
          subtitle={
            orders.length === 0
              ? 'sin resultados'
              : `${orders.length} en el mapa · ${pendingCount} sin repartidor`
          }
          className="mb-0"
        />
      </div>

      {orders.length === 0 ? (
        <RutaEmptyState
          size="sm"
          illustration={<IllustrationEmptyMap className="w-full" />}
          title="Ningún pedido coincide"
          description="Ajusta el estado, el repartidor o el día de entrega para ver pedidos aquí."
        />
      ) : (
        <ul className="u-stagger flex-1 divide-y divide-slate-200/70 overflow-y-auto dark:divide-white/10">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              swatches={swatches}
              busy={busyOrderId === order.id}
              onSelect={onSelectOrder}
              onRequestAssign={onRequestAssign}
              onUnassign={onUnassign}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}
    </RutaCard>
  )
}
