'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { DEFAULT_CENTER, ensureGoogleMaps } from '@orkoruta/web-shared'
import { mapStyles, prefersDark, watchColorScheme } from '@orkoruta/web-shared'
import { getCourierLocation, type CourierLocation } from '@/lib/tracking.api'

/** Cada cuánto se vuelve a preguntar. El repartidor reporta cada 20 s. */
const POLL_INTERVAL_MS = 20_000

interface CourierTrackingCardProps {
  orderId: number
  /** Solo se monta cuando el pedido va de camino; el backend lo revalida igual. */
  active: boolean
}

/** "hace 2 minutos" en cristiano, que es como se lee una hora reciente. */
function describeAge(seconds: number): string {
  if (seconds < 60) return 'hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  const hours = Math.floor(minutes / 60)
  return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
}

/**
 * Mapa con la posición del repartidor que trae el pedido.
 *
 * Se consulta por sondeo cada 20 s. No hay websockets en el proyecto y montar
 * esa infraestructura para un punto que se mueve despacio no compensa: el
 * repartidor reporta cada 20 s, así que un canal en vivo no enseñaría nada más.
 *
 * **La posición puede quedarse quieta y eso es esperable.** El panel del
 * repartidor es una web, y el navegador deja de reportar cuando el teléfono se
 * bloquea o el repartidor se pasa a Waze. Por eso la tarjeta siempre dice
 * *cuándo* se tomó la posición, y avisa cuando ya está vieja, en vez de mostrar
 * un punto que aparenta estar al día.
 */
export function CourierTrackingCard({ orderId, active }: CourierTrackingCardProps) {
  const [location, setLocation] = useState<CourierLocation | null>(null)
  const [loading, setLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const courierMarkerRef = useRef<google.maps.Marker | null>(null)
  const destMarkerRef = useRef<google.maps.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  // ── Sondeo ────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      setLocation(await getCourierLocation(orderId))
    } catch {
      // Un fallo puntual de red no debe borrar el último punto conocido: se
      // deja el que había y se reintenta en el siguiente ciclo.
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (!active) return
    void poll()
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [active, poll])

  // ── Mapa ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !location) return
    let cancelled = false
    let unwatchTheme: (() => void) | null = null

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new window.google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: mapStyles({ dark: prefersDark() }),
        })
        mapRef.current = map
        unwatchTheme = watchColorScheme((dark) => {
          map.setOptions({ styles: mapStyles({ dark }) })
        })
        setMapReady(true)
      })
      .catch(() => {
        if (!cancelled) setMapError(true)
      })

    return () => {
      cancelled = true
      unwatchTheme?.()
    }
  }, [active, location])

  // Mover los pines cuando llega una posición nueva.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !location) return
    const map = mapRef.current
    const courierPos = { lat: location.latitude, lng: location.longitude }

    if (courierMarkerRef.current) {
      courierMarkerRef.current.setPosition(courierPos)
    } else {
      courierMarkerRef.current = new window.google.maps.Marker({
        position: courierPos,
        map,
        title: location.courier_name ?? 'Repartidor',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#FD8B43',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      })
    }

    if (location.destination && !destMarkerRef.current) {
      destMarkerRef.current = new window.google.maps.Marker({
        position: { lat: location.destination.latitude, lng: location.destination.longitude },
        map,
        title: 'Tu dirección',
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#16a34a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
    }

    // Encuadra repartidor y destino para que se vea la distancia que falta.
    if (location.destination) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(courierPos)
      bounds.extend({
        lat: location.destination.latitude,
        lng: location.destination.longitude,
      })
      map.fitBounds(bounds, 64)
    } else {
      map.panTo(courierPos)
    }
  }, [mapReady, location])

  if (!active) return null

  if (loading) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Seguimiento" subtitle="tu pedido en camino" />
        <div className="u-skeleton h-56 rounded-lg" />
      </RutaCard>
    )
  }

  // Sin posición: el repartidor salió pero su teléfono aún no ha reportado.
  if (!location) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Seguimiento" subtitle="tu pedido en camino" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tu pedido va en camino. Todavía no recibimos la ubicación del
          repartidor; aparecerá aquí en cuanto la comparta.
        </p>
      </RutaCard>
    )
  }

  return (
    <RutaCard className="overflow-hidden p-0">
      <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
        <RutaSectionHeader
          title={location.courier_name ? `${location.courier_name} va en camino` : 'Va en camino'}
          subtitle="seguimiento"
          className="mb-0"
        />
      </div>

      {mapError ? (
        <p className="p-4 text-sm text-slate-600 dark:text-slate-400">
          No pudimos cargar el mapa.
        </p>
      ) : (
        <div ref={containerRef} className="h-56 w-full bg-slate-100 dark:bg-[#1d2025]" />
      )}

      <div className="p-4">
        {location.is_stale ? (
          // Nunca se hace pasar una posición vieja por actual: es peor esperar
          // en la puerta por un punto congelado que saber que está desfasado.
          <p className="rounded-lg border border-amber-400/30 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Última ubicación conocida {describeAge(location.age_seconds)}. Puede
            que el repartidor tenga el teléfono bloqueado o esté usando el
            navegador; sigue en ruta.
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Actualizado {describeAge(location.age_seconds)}
          </p>
        )}
      </div>
    </RutaCard>
  )
}
