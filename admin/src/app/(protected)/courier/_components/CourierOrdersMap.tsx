'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CENTER,
  ensureGoogleMaps,
  mapStyles,
  prefersDark,
  watchColorScheme,
} from '@orkoruta/web-shared'
import { formatDeliveryAddress, type CourierOrder } from '@/lib/courier_orders.api'

/**
 * Mapa con los pedidos activos del repartidor.
 *
 * Antes el repartidor solo tenía un botón «Google Maps» por pedido y no veía
 * en ningún lado dónde quedaba todo lo que llevaba. Aquí cada pedido es un pin
 * numerado en el mismo orden que la lista; tocarlo abre el pedido. El botón de
 * abajo arma la ruta completa en Google Maps con todas las paradas.
 */

/** Google Maps acepta hasta 9 paradas intermedias en un enlace de ruta. */
const MAX_WAYPOINTS = 9

function withCoords(orders: CourierOrder[]) {
  return orders.filter(
    (o) =>
      typeof o.delivery_address?.latitude === 'number' &&
      typeof o.delivery_address?.longitude === 'number',
  )
}

/**
 * Enlace de ruta de Google Maps: sale de donde esté el teléfono y pasa por
 * cada pedido en el orden de la lista. La última parada es el destino.
 */
export function buildRouteUrl(orders: CourierOrder[]): string | null {
  const stops = withCoords(orders).map(
    (o) => `${o.delivery_address!.latitude},${o.delivery_address!.longitude}`,
  )
  if (stops.length === 0) return null
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1).slice(0, MAX_WAYPOINTS)
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' })
  if (waypoints.length) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export default function CourierOrdersMap({ orders }: { orders: CourierOrder[] }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unwatch: (() => void) | null = null

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new window.google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: mapStyles({ dark: prefersDark(), hidePois: true }),
        })
        mapRef.current = map
        unwatch = watchColorScheme((dark) => map.setOptions({ styles: mapStyles({ dark, hidePois: true }) }))
        setReady(true)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
      unwatch?.()
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const located = withCoords(orders)
    const bounds = new window.google.maps.LatLngBounds()

    orders.forEach((order, index) => {
      const addr = order.delivery_address
      if (typeof addr?.latitude !== 'number' || typeof addr?.longitude !== 'number') return
      const position = { lat: addr.latitude, lng: addr.longitude }
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: `#${order.id} — ${formatDeliveryAddress(addr)}`,
        label: { text: String(index + 1), color: '#ffffff', fontWeight: '700' },
      })
      marker.addListener('click', () => router.push(`/courier/${order.id}`))
      markersRef.current.push(marker)
      bounds.extend(position)
    })

    if (located.length === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(15)
    } else if (located.length > 1) {
      map.fitBounds(bounds, 48)
    }
  }, [orders, ready, router])

  const routeUrl = buildRouteUrl(orders)
  const missing = orders.length - withCoords(orders).length

  if (error) {
    return (
      <p className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
        No se pudo cargar el mapa: {error}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="isolate h-[60vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-[#1d2025]"
        aria-label="Mapa de mis pedidos"
      />

      {missing > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {missing === 1
            ? '1 pedido no tiene ubicación en el mapa: ábrelo desde la lista.'
            : `${missing} pedidos no tienen ubicación en el mapa: ábrelos desde la lista.`}
        </p>
      )}

      {routeUrl && (
        <a
          href={routeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-4 text-sm font-semibold text-violet-700 dark:border-violet-400/25 dark:text-violet-300"
        >
          🗺 Abrir la ruta completa en Google Maps
        </a>
      )}

      <ol className="space-y-1 text-sm">
        {orders.map((order, index) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => router.push(`/courier/${order.id}`)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                  {formatDeliveryAddress(order.delivery_address)}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  #{order.id} · {order.buyer_name}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
