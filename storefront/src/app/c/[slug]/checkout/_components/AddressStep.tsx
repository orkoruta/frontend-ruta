'use client'

import { useEffect, useMemo, useRef } from 'react'
import { RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import type { DeliveryAddress, DeliveryType, PickupPoint } from './CheckoutStepper'

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement) => LeafletMap
      tileLayer: (url: string, options: Record<string, unknown>) => LeafletLayer
      marker: (
        latLng: [number, number],
        options?: Record<string, unknown>,
      ) => LeafletMarker
      icon: (options: Record<string, unknown>) => unknown
    }
  }
}

interface LeafletMap {
  setView: (latLng: [number, number], zoom: number) => LeafletMap
  on: (event: string, callback: (event: { latlng: { lat: number; lng: number } }) => void) => void
  invalidateSize: () => void
  remove: () => void
}

interface LeafletLayer {
  addTo: (map: LeafletMap) => LeafletLayer
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker
  bindPopup: (content: string) => LeafletMarker
  setLatLng: (latLng: [number, number]) => LeafletMarker
}

interface AddressStepProps {
  deliveryType: DeliveryType
  address: DeliveryAddress
  pickupPoints: PickupPoint[]
  selectedPickupPointId: number | null
  onAddressChange: (value: DeliveryAddress) => void
  onPickupPointChange: (value: number) => void
}

const DEFAULT_POSITION: [number, number] = [4.7109, -74.0721]
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

function ensureLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.L) return Promise.resolve()

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = LEAFLET_CSS
    document.head.appendChild(link)
  }

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS}"]`)
  if (existingScript) {
    return new Promise((resolve) => {
      existingScript.addEventListener('load', () => resolve(), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Leaflet no pudo cargar'))
    document.body.appendChild(script)
  })
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:focus:border-sky-400/50"
      />
    </label>
  )
}

export default function AddressStep({
  deliveryType,
  address,
  pickupPoints,
  selectedPickupPointId,
  onAddressChange,
  onPickupPointChange,
}: AddressStepProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const addressRef = useRef(address)
  const deliveryTypeRef = useRef(deliveryType)

  useEffect(() => {
    addressRef.current = address
    deliveryTypeRef.current = deliveryType
  }, [address, deliveryType])

  const selectedPickup = pickupPoints.find((point) => point.id === selectedPickupPointId)
  const position = useMemo<[number, number]>(
    () =>
      deliveryType === 'SHIP'
        ? [address.latitude ?? DEFAULT_POSITION[0], address.longitude ?? DEFAULT_POSITION[1]]
        : [
            selectedPickup?.latitude ?? DEFAULT_POSITION[0],
            selectedPickup?.longitude ?? DEFAULT_POSITION[1],
          ],
    [address.latitude, address.longitude, deliveryType, selectedPickup],
  )

  useEffect(() => {
    let cancelled = false

    ensureLeaflet()
      .then(() => {
        if (cancelled || !window.L || !mapElementRef.current || mapRef.current) return

        const map = window.L.map(mapElementRef.current).setView(position, 13)
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map)

        const marker = window.L.marker(position).addTo(map)
        markerRef.current = marker
        mapRef.current = map

        map.on('click', (event) => {
          if (deliveryTypeRef.current !== 'SHIP') return
          marker.setLatLng([event.latlng.lat, event.latlng.lng])
          onAddressChange({
            ...addressRef.current,
            latitude: Number(event.latlng.lat.toFixed(6)),
            longitude: Number(event.latlng.lng.toFixed(6)),
          })
        })

        setTimeout(() => map.invalidateSize(), 100)
      })
      .catch(() => {
        // The form remains usable if the CDN map cannot be loaded.
      })

    return () => {
      cancelled = true
    }
  }, [onAddressChange, position])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    mapRef.current.setView(position, 13)
    markerRef.current.setLatLng(position)
    setTimeout(() => mapRef.current?.invalidateSize(), 100)
  }, [position])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return (
    <RutaCard>
      <RutaSectionHeader
        title={deliveryType === 'SHIP' ? 'Dirección de entrega' : 'Punto de recogida'}
        subtitle="paso 2"
      />

      {deliveryType === 'SHIP' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Dirección"
              value={address.line}
              required
              placeholder="Cra 7 # 100 - 50"
              onChange={(line) => onAddressChange({ ...address, line })}
            />
            <Field
              label="Ciudad"
              value={address.city}
              required
              onChange={(city) => onAddressChange({ ...address, city })}
            />
            <Field
              label="Departamento"
              value={address.state}
              required
              onChange={(state) => onAddressChange({ ...address, state })}
            />
            <Field
              label="Código postal"
              value={address.postal_code}
              onChange={(postal_code) => onAddressChange({ ...address, postal_code })}
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Instrucciones adicionales
            </span>
            <textarea
              value={address.instructions}
              rows={3}
              onChange={(event) =>
                onAddressChange({ ...address, instructions: event.target.value })
              }
              className="w-full resize-none rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:focus:border-sky-400/50"
              placeholder="Apto, torre, referencias o indicaciones para el repartidor."
            />
          </label>
        </div>
      ) : (
        <div className="mb-4 grid gap-3">
          {pickupPoints.map((point) => {
            const selected = point.id === selectedPickupPointId
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => onPickupPointChange(point.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? 'border-sky-400/50 bg-sky-500/[0.12] dark:border-sky-400/25'
                    : 'border-slate-200/90 bg-white/[0.5] hover:bg-white/[0.76] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {point.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {point.address}
                    </p>
                  </div>
                  <RutaPill variant={selected ? 'blue' : 'slate'}>{point.city}</RutaPill>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200/90 dark:border-white/10">
        <div ref={mapElementRef} className="h-72 w-full bg-slate-100 dark:bg-[#181a1e]" />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {deliveryType === 'SHIP'
          ? 'Haz clic en el mapa para ajustar la ubicación de entrega.'
          : 'El mapa muestra el punto físico seleccionado.'}
      </p>
    </RutaCard>
  )
}
