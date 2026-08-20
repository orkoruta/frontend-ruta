/**
 * Horarios de un punto físico: `opening_hours` es un objeto JSON en la BD, no
 * una cadena.
 *
 * El formulario lo edita como texto porque es lo que el operador espera
 * escribir, así que hay que traducir en ambos sentidos. El formato es una
 * línea por franja, `clave: valor`:
 *
 *     lunes-domingo: 12:00-22:00
 *     festivos: cerrado
 *
 * que corresponde a `{"lunes-domingo": "12:00-22:00", "festivos": "cerrado"}`.
 * Las claves las escribe el Cliente; RUTA no impone un vocabulario de días
 * porque cada negocio agrupa la semana a su manera.
 *
 * Antes el formulario mandaba un campo plano `schedule` que el backend ni
 * siquiera leía —Zod lo descartaba en silencio—, así que el horario nunca se
 * guardaba desde la interfaz.
 */

/** Objeto JSON → texto editable. Una línea por franja. */
export function openingHoursToText(hours: unknown): string {
  if (hours === null || hours === undefined) return ''
  if (typeof hours === 'string') return hours
  if (typeof hours !== 'object' || Array.isArray(hours)) return ''

  return Object.entries(hours as Record<string, unknown>)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('\n')
}

/**
 * Texto editable → objeto JSON. `undefined` si no hay nada que guardar, para
 * que el backend distinga «no lo toques» de «déjalo vacío».
 *
 * Una línea sin `:` se guarda bajo la clave `horario`; es lo que pasa cuando
 * alguien escribe solo «12:00 a 22:00» y no conviene perder el dato por no
 * seguir el formato.
 */
export function textToOpeningHours(text: string): Record<string, string> | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return undefined

  const result: Record<string, string> = {}
  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator === -1) {
      result.horario = line
      continue
    }
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (key) result[key] = value
  }

  return Object.keys(result).length > 0 ? result : undefined
}
