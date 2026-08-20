'use client'

import {
  RutaButton,
  RutaCard,
  RutaSectionHeader,
  RutaEmptyState,
  IllustrationEmptyMap,
} from '@orkoruta/ui'
import { isAssigned, type MapOrder } from '@/lib/assignment.api'
import { formatDeliveryDateShort } from '@orkoruta/web-shared'
import { MAP_PIN_COLORS } from './map_legend'

interface OrdersPanelProps {
  /** Pedidos ya filtrados por el selector de estado y el de fecha. */
  orders: MapOrder[]
  selectedOrderId: number | null
  onSelectOrder: (orderId: number) => void
  onRequestAssign: (order: MapOrder) => void
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
 * Fila de pedido. Los que no tienen repartidor traen el botón de asignar; los
 * que ya lo tienen muestran quién lo lleva (reasignar no se hace desde el mapa).
 */
function OrderRow({
  order,
  isSelected,
  onSelect,
  onRequestAssign,
}: {
  order: MapOrder
  isSelected: boolean
  onSelect: (orderId: number) => void
  onRequestAssign: (order: MapOrder) => void
}) {
  const assigned = isAssigned(order)

  // El punto replica el color del pin en el mapa, para poder emparejar la fila
  // con el pin sin tener que leer el número de pedido.
  const dotColor = isSelected
    ? MAP_PIN_COLORS.selected
    : assigned
      ? MAP_PIN_COLORS.assigned
      : MAP_PIN_COLORS.pending

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
      {/* El botón de asignar no puede ir dentro del de seleccionar: son
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
            {order.courier_name
              ? `${order.delivery_address_city} · ${order.courier_name}`
              : order.delivery_address_city}
          </p>
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

      {!assigned && (
        <div className="mt-2 flex justify-end">
          <RutaButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onRequestAssign(order)}
          >
            Asignar
          </RutaButton>
        </div>
      )}
    </li>
  )
}

/**
 * Panel lateral del mapa: un solo rectángulo con los pedidos que pasan los
 * filtros. Antes eran tres tarjetas (leyenda, por asignar, en reparto) más la
 * del repartidor asignado; ahora el estado se elige arriba con el selector y la
 * lista es una sola, así que el color del punto basta para distinguirlos.
 */
export function OrdersPanel({
  orders,
  selectedOrderId,
  onSelectOrder,
  onRequestAssign,
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
          description="Ajusta el estado o el día de entrega para ver pedidos aquí."
        />
      ) : (
        <ul className="u-stagger flex-1 divide-y divide-slate-200/70 overflow-y-auto dark:divide-white/10">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isSelected={order.id === selectedOrderId}
              onSelect={onSelectOrder}
              onRequestAssign={onRequestAssign}
            />
          ))}
        </ul>
      )}
    </RutaCard>
  )
}
