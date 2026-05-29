'use client'

/**
 * AssignmentMap
 *
 * Implementa el mapa con Leaflet + OpenStreetMap.
 *
 * LEAFLET NO ESTÁ INSTALADO todavía. Para activar el mapa real ejecuta:
 *   pnpm --filter @ruta/admin add leaflet
 *   pnpm --filter @ruta/admin add -D @types/leaflet
 *
 * Mientras tanto el componente renderiza un contenedor vacío (div gris)
 * que no produce errores en build ni en typecheck.
 * Cuando leaflet esté instalado el import dinámico resolverá y el mapa
 * se inicializará automáticamente sin cambiar el código.
 */

import { useEffect, useRef } from 'react'
import type { MapOrder } from '@/lib/assignment.api'

interface AssignmentMapProps {
  orders: MapOrder[]
  selectedOrderId: number | null
  focusOrder: MapOrder | null
  onSelectOrder: (orderId: number) => void
}

// Colombia center
const COLOMBIA_LAT = 4.5709
const COLOMBIA_LNG = -74.2973
const DEFAULT_ZOOM = 6

// Minimal type shim for the Leaflet API we use (avoids @types/leaflet dependency)
interface LeafletIconOptions {
  iconUrl: string
  iconSize: [number, number]
  iconAnchor: [number, number]
  shadowUrl?: string
  iconRetinaUrl?: string
}

interface LeafletMarker {
  setIcon(icon: LeafletIcon): this
  remove(): this
  bindTooltip(content: string, options?: Record<string, unknown>): this
  on(event: string, handler: () => void): this
  addTo(map: LeafletMap): this
}

interface LeafletIcon {
  _url?: string
}

interface LeafletMap {
  flyTo(latlng: [number, number], zoom?: number, options?: Record<string, unknown>): this
  remove(): void
}

interface LeafletTileLayer {
  addTo(map: LeafletMap): this
}

interface LeafletIconDefault {
  prototype: Record<string, unknown>
  mergeOptions(options: Partial<LeafletIconOptions>): void
}

interface LeafletStatic {
  map(container: HTMLElement, options?: Record<string, unknown>): LeafletMap
  tileLayer(urlTemplate: string, options?: Record<string, unknown>): LeafletTileLayer
  marker(latlng: [number, number], options?: Record<string, unknown>): LeafletMarker
  icon(options: LeafletIconOptions): LeafletIcon
  Icon: { Default: LeafletIconDefault }
}

// Marker SVG helpers
function buildIconDataUrl(color: string, size: number): string {
  const height = Math.round(size * 1.4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 28 39"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.61 14 25 14 25S28 23.61 28 14C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const ICON_PENDING = buildIconDataUrl('#f59e0b', 28)   // amber – AWAITING_COURIER_ASSIGNMENT
const ICON_SELECTED = buildIconDataUrl('#0ea5e9', 34)  // sky blue – selected order

// Attempt to load Leaflet; returns null if the package is not installed
async function tryLoadLeaflet(): Promise<LeafletStatic | null> {
  try {
    const mod = await import(
      /* webpackIgnore: true */
      'leaflet' as string
    ) as unknown as { default?: LeafletStatic }
    return mod.default ?? (mod as unknown as LeafletStatic)
  } catch {
    return null
  }
}

export function AssignmentMap({
  orders,
  selectedOrderId,
  focusOrder,
  onSelectOrder,
}: AssignmentMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<number, LeafletMarker>>(new Map())

  // ── Initialize Leaflet map once ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false
    const markers = markersRef.current

    void tryLoadLeaflet().then((L) => {
      if (cancelled || !L || !containerRef.current || mapRef.current) return

      // Fix default icon paths broken by webpack
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '',
        iconUrl: '',
        shadowUrl: '',
      })

      const map = L.map(containerRef.current, {
        center: [COLOMBIA_LAT, COLOMBIA_LNG],
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    })

    return () => {
      cancelled = true
      const map = mapRef.current
      if (map) {
        map.remove()
        mapRef.current = null
      }
      markers.clear()
    }
  }, [])

  // ── Sync markers when orders or selection changes ─────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    void tryLoadLeaflet().then((L) => {
      if (!L || !mapRef.current) return

      const existingIds = new Set(markersRef.current.keys())
      const newIds = new Set(orders.map((o) => o.id))

      // Remove stale markers
      for (const id of existingIds) {
        if (!newIds.has(id)) {
          markersRef.current.get(id)?.remove()
          markersRef.current.delete(id)
        }
      }

      // Add or update markers
      for (const order of orders) {
        if (
          typeof order.latitude !== 'number' ||
          typeof order.longitude !== 'number' ||
          !Number.isFinite(order.latitude) ||
          !Number.isFinite(order.longitude)
        ) continue

        const isSelected = order.id === selectedOrderId
        const iconUrl = isSelected ? ICON_SELECTED : ICON_PENDING
        const iconSizeVal: [number, number] = isSelected ? [34, 47] : [28, 39]
        const iconAnchor: [number, number] = [iconSizeVal[0] / 2, iconSizeVal[1]]

        const icon = L.icon({ iconUrl, iconSize: iconSizeVal, iconAnchor })

        if (markersRef.current.has(order.id)) {
          markersRef.current.get(order.id)!.setIcon(icon)
        } else {
          const capturedOrderId = order.id
          const marker = L.marker([order.latitude, order.longitude], { icon })
          marker.addTo(mapRef.current!)
          marker.bindTooltip(
            `#${order.id} — ${order.delivery_address_city}`,
            { permanent: false, direction: 'top' },
          )
          marker.on('click', () => onSelectOrder(capturedOrderId))
          markersRef.current.set(order.id, marker)
        }
      }
    })
  }, [orders, selectedOrderId, onSelectOrder])

  // ── Pan to focused order ──────────────────────────────────────────────────
  useEffect(() => {
    if (!focusOrder || !mapRef.current) return
    if (
      typeof focusOrder.latitude !== 'number' ||
      typeof focusOrder.longitude !== 'number' ||
      !Number.isFinite(focusOrder.latitude) ||
      !Number.isFinite(focusOrder.longitude)
    ) return

    mapRef.current.flyTo([focusOrder.latitude, focusOrder.longitude], 14, {
      animate: true,
      duration: 0.8,
    })
  }, [focusOrder])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-slate-100 dark:bg-[#1d2025]"
      style={{ minHeight: 400 }}
      aria-label="Mapa de asignación de pedidos"
    />
  )
}
