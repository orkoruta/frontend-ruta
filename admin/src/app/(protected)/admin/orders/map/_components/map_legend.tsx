'use client'

/**
 * Convenciones de color del mapa de asignación.
 *
 * Los colores viven aquí y no en cada componente porque los pines (SVG de
 * Google Maps, que necesita un hex) y la leyenda (HTML) tienen que coincidir
 * siempre: si se separan, la leyenda miente en cuanto alguien retoca un color.
 *
 * Cada repartidor tiene **su** color. Antes todos los asignados salían en el
 * mismo verde y en el mapa no había forma de saber qué puntos llevaba cada uno.
 */

import type { MapOrder } from '@/lib/assignment.api'

export const MAP_PIN_COLORS = {
  /** Espera repartidor. */
  pending: '#3730a3', // índigo oscuro
  /** El pedido que el operador está mirando ahora. */
  selected: '#f59e0b', // ámbar
} as const

/**
 * Colores de repartidor: bien separados entre sí y de los dos reservados
 * (índigo = por asignar, ámbar = seleccionado), legibles en claro y oscuro.
 */
const COURIER_PALETTE = [
  '#16a34a', // verde
  '#dc2626', // rojo
  '#0891b2', // cian
  '#db2777', // rosa
  '#7c3aed', // violeta
  '#ea580c', // naranja
  '#0d9488', // verde azulado
  '#65a30d', // lima
  '#2563eb', // azul
  '#92400e', // café
  '#be123c', // carmesí
  '#475569', // pizarra
] as const

export interface CourierSwatch {
  id: number
  name: string
  color: string
  count: number
}

/**
 * Asigna un color a cada repartidor presente. Se ordena por id para que un
 * repartidor conserve su color entre refrescos del mapa mientras el conjunto de
 * repartidores no cambie.
 */
export function buildCourierSwatches(orders: MapOrder[]): Map<number, CourierSwatch> {
  const byCourier = new Map<number, { name: string; count: number }>()
  for (const order of orders) {
    if (order.courier_user_id === null) continue
    const current = byCourier.get(order.courier_user_id)
    byCourier.set(order.courier_user_id, {
      name: order.courier_name ?? `Repartidor #${order.courier_user_id}`,
      count: (current?.count ?? 0) + 1,
    })
  }

  const swatches = new Map<number, CourierSwatch>()
  ;[...byCourier.keys()]
    .sort((a, b) => a - b)
    .forEach((id, index) => {
      const info = byCourier.get(id)!
      swatches.set(id, {
        id,
        name: info.name,
        count: info.count,
        color: COURIER_PALETTE[index % COURIER_PALETTE.length],
      })
    })
  return swatches
}

/** Color del pin o del punto de la fila de un pedido. */
export function orderColor(
  order: MapOrder,
  selected: boolean,
  swatches: Map<number, CourierSwatch>,
): string {
  if (selected) return MAP_PIN_COLORS.selected
  if (order.courier_user_id === null) return MAP_PIN_COLORS.pending
  return swatches.get(order.courier_user_id)?.color ?? COURIER_PALETTE[0]
}

export function MapLegend({ swatches }: { swatches: Map<number, CourierSwatch> }) {
  const items: { key: string; color: string; label: string }[] = [
    { key: 'pending', color: MAP_PIN_COLORS.pending, label: 'Por asignar' },
    ...[...swatches.values()].map((s) => ({
      key: `c-${s.id}`,
      color: s.color,
      label: `${s.name} (${s.count})`,
    })),
    { key: 'selected', color: MAP_PIN_COLORS.selected, label: 'Seleccionado' },
  ]

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Convenciones del mapa">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/70 dark:ring-black/40"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
