'use client'

import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { isAssigned, type MapOrder } from '@/lib/assignment.api'
import { MAP_PIN_COLORS, MapLegend } from './map_legend'

interface PendingOrdersPanelProps {
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
 * Fila de pedido, igual en ambas listas: cambia el color del punto y solo las
 * pendientes traen el botón de asignar.
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
  onRequestAssign?: (order: MapOrder) => void
}) {
  // El punto replica el color del pin en el mapa, para poder emparejar la fila
  // con el pin sin tener que leer el número de pedido.
  const dotColor = isSelected
    ? MAP_PIN_COLORS.selected
    : isAssigned(order)
      ? MAP_PIN_COLORS.assigned
      : MAP_PIN_COLORS.pending

  return (
    <li
      className={[
        'px-4 py-3 transition-colors',
        isSelected
          ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12]'
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

      {onRequestAssign && (
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

export function PendingOrdersPanel({
  orders,
  selectedOrderId,
  onSelectOrder,
  onRequestAssign,
}: PendingOrdersPanelProps) {
  const pendingOrders = orders.filter((o) => !isAssigned(o))
  const assignedOrders = orders.filter(isAssigned)

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Convenciones del mapa */}
      <RutaCard>
        <MapLegend />
      </RutaCard>

      {/* Pedidos por asignar */}
      <RutaCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader
            title="Pedidos por asignar"
            subtitle={`${pendingOrders.length} sin repartidor`}
            className="mb-0"
          />
        </div>

        {pendingOrders.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No hay pedidos pendientes de asignación.
          </div>
        ) : (
          <ul className="max-h-72 divide-y divide-slate-200/70 overflow-y-auto dark:divide-white/10">
            {pendingOrders.map((order) => (
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

      {/* Pedidos ya asignados — contexto para decidir, no accionables desde aquí */}
      {assignedOrders.length > 0 && (
        <RutaCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
            <RutaSectionHeader
              title="En reparto"
              subtitle={`${assignedOrders.length} con repartidor`}
              className="mb-0"
            />
          </div>
          <ul className="max-h-72 divide-y divide-slate-200/70 overflow-y-auto dark:divide-white/10">
            {assignedOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                isSelected={order.id === selectedOrderId}
                onSelect={onSelectOrder}
              />
            ))}
          </ul>
        </RutaCard>
      )}

      {/* Pedido asignado seleccionado: se muestra quién lo lleva, no la lista de
          repartidores — reasignar no se hace desde este mapa. */}
      {selectedOrder && isAssigned(selectedOrder) && (
        <RutaCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
            <RutaSectionHeader
              title="Repartidor asignado"
              subtitle={`pedido #${selectedOrder.id}`}
              className="mb-0"
            />
          </div>
          <div className="p-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {selectedOrder.courier_name}
            </p>
            {selectedOrder.courier_phone && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedOrder.courier_phone}
              </p>
            )}
          </div>
        </RutaCard>
      )}
    </div>
  )
}
