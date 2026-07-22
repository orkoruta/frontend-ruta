'use client'

import { useEffect, useMemo, useRef } from 'react'
import { RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { DEFAULT_CENTER, ensureGoogleMaps } from '@/lib/google-maps'
import type { DeliveryAddress, DeliveryType, PickupPoint } from './CheckoutStepper'

interface AddressStepProps {
  deliveryType: DeliveryType
  address: DeliveryAddress
  pickupPoints: PickupPoint[]
  selectedPickupPointId: number | null
  onAddressChange: (value: DeliveryAddress) => void
  onPickupPointChange: (value: number) => void
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
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const addressRef = useRef(address)
  const deliveryTypeRef = useRef(deliveryType)

  useEffect(() => {
    addressRef.current = address
    deliveryTypeRef.current = deliveryType
  }, [address, deliveryType])

  const selectedPickup = pickupPoints.find((point) => point.id === selectedPickupPointId)
  const position = useMemo<google.maps.LatLngLiteral>(
    () =>
      deliveryType === 'SHIP'
        ? {
            lat: address.latitude ?? DEFAULT_CENTER.lat,
            lng: address.longitude ?? DEFAULT_CENTER.lng,
          }
        : {
            lat: selectedPickup?.latitude ?? DEFAULT_CENTER.lat,
            lng: selectedPickup?.longitude ?? DEFAULT_CENTER.lng,
          },
    [address.latitude, address.longitude, deliveryType, selectedPickup],
  )

  // El mapa se crea una sola vez; si dependiera de `position` se reconstruiría
  // con cada coordenada y perdería el zoom del comprador.
  const initialPositionRef = useRef(position)

  useEffect(() => {
    let cancelled = false

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !window.google || !mapElementRef.current || mapRef.current) return

        const map = new window.google.maps.Map(mapElementRef.current, {
          center: initialPositionRef.current,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        const marker = new window.google.maps.Marker({
          position: initialPositionRef.current,
          map,
          draggable: true,
        })

        mapRef.current = map
        markerRef.current = marker

        function commit(latLng: google.maps.LatLng) {
          if (deliveryTypeRef.current !== 'SHIP') return
          onAddressChange({
            ...addressRef.current,
            latitude: Number(latLng.lat().toFixed(6)),
            longitude: Number(latLng.lng().toFixed(6)),
          })
        }

        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng || deliveryTypeRef.current !== 'SHIP') return
          marker.setPosition(event.latLng)
          commit(event.latLng)
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (pos) commit(pos)
        })
      })
      .catch(() => {
        // El formulario sigue siendo usable si el mapa no carga.
      })

    return () => {
      cancelled = true
    }
  }, [onAddressChange])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    mapRef.current.panTo(position)
    markerRef.current.setPosition(position)
  }, [position])

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
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
