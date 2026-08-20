/**
 * Día de entrega programada.
 *
 * El backend manda `YYYY-MM-DD` (un día calendario, no un instante).
 * `new Date('2026-08-14')` lo interpreta como medianoche **UTC**, así que
 * formatearlo con la zona local mostraría el 13 de agosto en Colombia (UTC-5).
 * Por eso todo el formateo va anclado a `timeZone: 'UTC'`.
 */

const LONG_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const SHORT_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** `2026-08-14` → `jueves, 14 de agosto de 2026`. */
export function formatDeliveryDate(dateOnly: string | null): string | null {
  if (!dateOnly) return null
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return LONG_FORMATTER.format(parsed)
}

/** `2026-08-14` → `jue, 14 ago`. Para listas y tarjetas estrechas. */
export function formatDeliveryDateShort(dateOnly: string | null): string | null {
  if (!dateOnly) return null
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return SHORT_FORMATTER.format(parsed)
}

/** Hoy en `YYYY-MM-DD` según el reloj local, para el mínimo del selector. */
export function todayDateOnly(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
