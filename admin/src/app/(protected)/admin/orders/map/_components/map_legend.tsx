'use client'

/**
 * Convenciones de color del mapa de asignación.
 *
 * Los colores viven aquí y no en cada componente porque los pines (SVG de
 * Google Maps, que necesita un hex) y la leyenda (HTML) tienen que coincidir
 * siempre: si se separan, la leyenda miente en cuanto alguien retoca un color.
 */

export const MAP_PIN_COLORS = {
  /** Espera repartidor. */
  pending: '#3730a3', // índigo oscuro
  /** Ya tiene repartidor encima. */
  assigned: '#16a34a', // verde
  /** El pedido que el operador está mirando ahora. */
  selected: '#f59e0b', // ámbar
} as const

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: MAP_PIN_COLORS.pending, label: 'Por asignar' },
  { color: MAP_PIN_COLORS.assigned, label: 'Asignado' },
  { color: MAP_PIN_COLORS.selected, label: 'Seleccionado' },
]

export function MapLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Convenciones del mapa">
      {LEGEND_ITEMS.map((item) => (
        <li
          key={item.label}
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
