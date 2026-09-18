'use client'

import { useEffect, useState } from 'react'

/**
 * Lee un parámetro dinámico de la ruta **desde la URL del navegador**.
 *
 * Por qué no vale `useParams()` ni `props.params`:
 *
 * Las dos apps son export estático (`output: 'export'`). Cada ruta con
 * parámetro se construye **una sola vez** con el marcador `_`
 * (`generateStaticParams([{ id: '_' }])`) y Render reescribe cualquier
 * `/admin/orders/135` a ese mismo HTML. El árbol de rutas queda horneado en el
 * documento con el segmento literal `_` —se ve en el payload como
 * `\"orders\",\"_\"`—, así que:
 *
 *   - `useParams()` devuelve `{ id: '_' }`, no el id real.
 *   - `props.params.id` es peor: se evalúa en el build, de modo que un
 *     `Number(params.id)` deja un `NaN` **escrito en el HTML**.
 *
 * El resultado era una pantalla de detalle que se quedaba cargando para
 * siempre sin llegar a pedir nada a la API. La barra de direcciones es lo
 * único que sabe qué registro quiere el usuario.
 *
 * Devuelve `null` en el primer render (no hay `window` en el build) y el valor
 * ya resuelto en cuanto monta: quien lo use debe tratar `null` como «cargando»,
 * no como «no existe».
 */
export function useRouteSegment(posicionDesdeElFinal = 0): string | null {
  const [valor, setValor] = useState<string | null>(null)

  useEffect(() => {
    const partes = window.location.pathname.split('/').filter(Boolean)
    const bruto = partes[partes.length - 1 - posicionDesdeElFinal]
    setValor(bruto && bruto !== '_' ? decodeURIComponent(bruto) : null)
  }, [posicionDesdeElFinal])

  return valor
}

/** Igual que `useRouteSegment` pero numérico, para los ids BIGINT de RUTA. */
export function useRouteId(posicionDesdeElFinal = 0): number | null {
  const bruto = useRouteSegment(posicionDesdeElFinal)
  if (bruto === null) return null
  const n = Number(bruto)
  return Number.isFinite(n) && n > 0 ? n : null
}
