'use client'

/**
 * AssignmentMap
 *
 * Mapa de pedidos pendientes de asignación, sobre Google Maps.
 * El SDK se carga una vez por página desde `lib/google-maps.ts`.
 */

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_CENTER, ensureGoogleMaps } from '@/lib/google-maps'
import { isAssigned, type MapOrder } from '@/lib/assignment.api'
import { MAP_PIN_COLORS } from './map_legend'

interface AssignmentMapProps {
  orders: MapOrder[]
  selectedOrderId: number | null
  focusOrder: MapOrder | null
  onSelectOrder: (orderId: number) => void
}

const DEFAULT_ZOOM = 11
const FOCUS_ZOOM = 15

/** Color del pin según en qué punto de la operación está el pedido. */
function pinColor(order: MapOrder, selected: boolean): string {
  if (selected) return MAP_PIN_COLORS.selected
  return isAssigned(order) ? MAP_PIN_COLORS.assigned : MAP_PIN_COLORS.pending
}

/** Tooltip nativo del pin: con el mapa lleno, dice de un vistazo de quién es. */
function markerTitle(order: MapOrder): string {
  const where = order.delivery_address_city ?? ''
  const who = order.courier_name ? `Asignado a ${order.courier_name}` : 'Sin repartidor'
  return `#${order.id} — ${where}${where ? ' · ' : ''}${who}`
}

/** Pin SVG del color del estado, para no depender de assets externos. */
function buildIcon(color: string, selected: boolean): google.maps.Symbol {
  return {
    path: 'M12 0C5.4 0 0 5.4 0 12c0 8.2 12 24 12 24s12-15.8 12-24c0-6.6-5.4-12-12-12z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: selected ? 1.2 : 1,
    anchor: new window.google.maps.Point(12, 36),
  }
}

/**
 * Varios pedidos a la misma dirección devuelven coordenadas idénticas y sus
 * pines quedan perfectamente superpuestos: se ve uno y los demás son
 * inalcanzables. Se reparten en círculo alrededor del punto real para que todos
 * queden visibles y clicables.
 */
const COINCIDENT_SPREAD_DEGREES = 0.00018 // ~20 m

function spreadCoincidentPositions(
  orders: MapOrder[],
): Map<number, google.maps.LatLngLiteral> {
  const groups = new Map<string, MapOrder[]>()

  for (const order of orders) {
    if (!hasCoords(order)) continue
    const key = `${order.latitude},${order.longitude}`
    const group = groups.get(key)
    if (group) group.push(order)
    else groups.set(key, [order])
  }

  const positions = new Map<number, google.maps.LatLngLiteral>()

  for (const group of groups.values()) {
    const [first] = group
    const lat = first.latitude as number
    const lng = first.longitude as number

    if (group.length === 1) {
      positions.set(first.id, { lat, lng })
      continue
    }

    group.forEach((order, index) => {
      const angle = (2 * Math.PI * index) / group.length
      positions.set(order.id, {
        lat: lat + COINCIDENT_SPREAD_DEGREES * Math.sin(angle),
        // La longitud se corrige por la latitud para que el círculo no salga ovalado.
        lng: lng + (COINCIDENT_SPREAD_DEGREES * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180),
      })
    })
  }

  return positions
}

function hasCoords(order: MapOrder): boolean {
  return (
    typeof order.latitude === 'number' &&
    typeof order.longitude === 'number' &&
    Number.isFinite(order.latitude) &&
    Number.isFinite(order.longitude)
  )
}

export function AssignmentMap({
  orders,
  selectedOrderId,
  focusOrder,
  onSelectOrder,
}: AssignmentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map())
  // Posición realmente pintada de cada pin: puede estar desplazada si comparte
  // dirección con otros pedidos.
  const positionsRef = useRef<Map<number, google.maps.LatLngLiteral>>(new Map())
  const onSelectRef = useRef(onSelectOrder)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelectOrder
  }, [onSelectOrder])

  // ── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const markers = markersRef.current

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return

        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        setReady(true)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
      markers.forEach((marker) => marker.setMap(null))
      markers.clear()
      mapRef.current = null
    }
  }, [])

  // ── Marcadores ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    const markers = markersRef.current

    const positions = spreadCoincidentPositions(orders)
    positionsRef.current = positions
    const liveIds = new Set(orders.filter(hasCoords).map((o) => o.id))

    for (const [id, marker] of markers) {
      if (!liveIds.has(id)) {
        marker.setMap(null)
        markers.delete(id)
      }
    }

    for (const order of orders) {
      if (!hasCoords(order)) continue

      const isSelected = order.id === selectedOrderId
      const existing = markers.get(order.id)

      if (existing) {
        existing.setIcon(buildIcon(pinColor(order, isSelected), isSelected))
        existing.setTitle(markerTitle(order))
        existing.setZIndex(isSelected ? 1 : 0)
        continue
      }

      const marker = new window.google.maps.Marker({
        position: positions.get(order.id) ?? {
          lat: order.latitude as number,
          lng: order.longitude as number,
        },
        map,
        title: markerTitle(order),
        icon: buildIcon(pinColor(order, isSelected), isSelected),
      })
      marker.addListener('click', () => onSelectRef.current(order.id))
      markers.set(order.id, marker)
    }

    // Sin pedido seleccionado, el mapa encuadra todos los pines a la vez.
    if (markers.size > 0 && !selectedOrderId) {
      const bounds = new window.google.maps.LatLngBounds()
      markers.forEach((marker) => {
        const pos = marker.getPosition()
        if (pos) bounds.extend(pos)
      })
      map.fitBounds(bounds, 64)
    }
  }, [orders, selectedOrderId, ready])

  // ── Centrado al seleccionar ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !focusOrder || !hasCoords(focusOrder)) return
    // Centra el pin tal como se ve, no la coordenada cruda.
    const target = positionsRef.current.get(focusOrder.id) ?? {
      lat: focusOrder.latitude as number,
      lng: focusOrder.longitude as number,
    }
    mapRef.current.panTo(target)
    mapRef.current.setZoom(FOCUS_ZOOM)
  }, [focusOrder, ready])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-4 dark:bg-[#1d2025]">
        <p className="text-center text-sm text-rose-600 dark:text-rose-400">
          No se pudo cargar el mapa: {error}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-slate-100 dark:bg-[#1d2025]"
      style={{ minHeight: 400 }}
      aria-label="Mapa de asignación de pedidos"
    />
  )
}
