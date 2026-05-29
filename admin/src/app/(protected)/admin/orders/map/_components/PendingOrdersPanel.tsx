'use client'

import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import type { AvailableCourier, MapOrder } from '@/lib/assignment.api'

interface PendingOrdersPanelProps {
  orders: MapOrder[]
  selectedOrderId: number | null
  couriers: AvailableCourier[]
  loadingCouriers: boolean
  onSelectOrder: (orderId: number) => void
  onRequestAssign: (order: MapOrder, courier: AvailableCourier) => void
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

export function PendingOrdersPanel({
  orders,
  selectedOrderId,
  couriers,
  loadingCouriers,
  onSelectOrder,
  onRequestAssign,
}: PendingOrdersPanelProps) {
  const pendingOrders = orders.filter(
    (o) => o.order_status === 'AWAITING_COURIER_ASSIGNMENT',
  )

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null

  return (
    <div className="flex flex-col gap-4">
      {/* Orders list */}
      <RutaCard className="p-0 overflow-hidden">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader
            title="Pedidos listos"
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
            {pendingOrders.map((order) => {
              const isSelected = order.id === selectedOrderId
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className={[
                      'w-full px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12]'
                        : 'hover:bg-slate-50/[0.5] dark:hover:bg-white/[0.025]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                          <span
                            className={[
                              'inline-block h-2 w-2 rounded-full',
                              isSelected ? 'bg-sky-500' : 'bg-amber-400',
                            ].join(' ')}
                          />
                          #{order.id}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {order.delivery_address_line}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order.delivery_address_city}
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
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </RutaCard>

      {/* Couriers panel — only when an order is selected */}
      {selectedOrder && (
        <RutaCard className="p-0 overflow-hidden">
          <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
            <RutaSectionHeader
              title="Repartidores disponibles"
              subtitle={`pedido #${selectedOrder.id}`}
              className="mb-0"
            />
          </div>

          {loadingCouriers ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Cargando repartidores…
            </div>
          ) : couriers.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
              No hay repartidores disponibles en este momento.
            </div>
          ) : (
            <ul className="max-h-64 divide-y divide-slate-200/70 overflow-y-auto dark:divide-white/10">
              {couriers.map((courier) => (
                <li
                  key={courier.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {courier.full_name}
                    </p>
                    {courier.phone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {courier.phone}
                      </p>
                    )}
                  </div>
                  <RutaButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onRequestAssign(selectedOrder, courier)}
                  >
                    Asignar
                  </RutaButton>
                </li>
              ))}
            </ul>
          )}
        </RutaCard>
      )}
    </div>
  )
}
