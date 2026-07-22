'use client'

/**
 * Destino de entrega del pedido corporativo.
 *
 * SHIP   → dirección + coordenadas. Las coordenadas son obligatorias porque el
 *          mapa de asignación filtra por lat/lng no nulas: sin ellas el pedido
 *          nunca llega a un repartidor.
 * PICKUP → punto físico del propio Cliente.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { geocodeAddress } from '@/lib/geocoding'
import { DEFAULT_CENTER, ensureGoogleMaps } from '@/lib/google-maps'
import type { PickupPoint } from '@/lib/users.api'

export interface CorporateDeliveryAddress {
  line: string
  city: string
  state: string
  postal_code?: string
  latitude: number | null
  longitude: number | null
  instructions?: string
}

interface DeliveryTargetFieldsProps {
  deliveryType: 'SHIP' | 'PICKUP'
  address: CorporateDeliveryAddress
  pickupPoints: PickupPoint[]
  pickupPointId: number | ''
  disabled?: boolean
  onAddressChange: (value: CorporateDeliveryAddress) => void
  onPickupPointChange: (value: number | '') => void
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  )
}

export default function DeliveryTargetFields({
  deliveryType,
  address,
  pickupPoints,
  pickupPointId,
  disabled,
  onAddressChange,
  onPickupPointChange,
}: DeliveryTargetFieldsProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const onAddressChangeRef = useRef(onAddressChange)
  const addressRef = useRef(address)

  useEffect(() => {
    onAddressChangeRef.current = onAddressChange
    addressRef.current = address
  }, [onAddressChange, address])

  const position = useMemo<google.maps.LatLngLiteral>(
    () => ({
      lat: address.latitude ?? DEFAULT_CENTER.lat,
      lng: address.longitude ?? DEFAULT_CENTER.lng,
    }),
    [address.latitude, address.longitude],
  )

  // ── Geocodificación automática ──────────────────────────────────────────────
  // Las indicaciones de entrega ("Casa 19", "Torre B") no entran en la búsqueda:
  // describen el destino dentro del predio, no ubican la dirección.
  const [geocodeState, setGeocodeState] = useState<
    'idle' | 'searching' | 'exact' | 'approximate' | 'notFound' | 'error'
  >('idle')
  const [geocodedLabel, setGeocodedLabel] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const lastQueryRef = useRef<string | null>(null)

  const geocodeQuery = useMemo(
    () => ({
      street: address.line.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postal_code?.trim() || undefined,
    }),
    [address.line, address.city, address.state, address.postal_code],
  )

  useEffect(() => {
    if (deliveryType !== 'SHIP') return
    if (!geocodeQuery.street || !geocodeQuery.city) {
      setGeocodeState('idle')
      return
    }

    const key = `${geocodeQuery.street}|${geocodeQuery.city}|${geocodeQuery.state}|${geocodeQuery.postalCode ?? ''}`
    // Un clic manual no cambia el texto, así que no vuelve a disparar la búsqueda
    // ni pisa las coordenadas que el operador acaba de elegir.
    if (key === lastQueryRef.current) return

    const controller = new AbortController()
    // Debounce: cada consulta a Google se cobra, así que no se dispara por tecla.
    const timer = window.setTimeout(async () => {
      setGeocodeState('searching')
      try {
        const result = await geocodeAddress(geocodeQuery, controller.signal)
        lastQueryRef.current = key

        if (!result) {
          setGeocodeState('notFound')
          setGeocodedLabel(null)
          return
        }

        setGeocodeState(result.isPrecise ? 'exact' : 'approximate')
        setGeocodedLabel(result.formattedAddress)
        onAddressChangeRef.current({
          ...addressRef.current,
          latitude: result.latitude,
          longitude: result.longitude,
        })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setGeocodeState('error')
      }
    }, 900)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [deliveryType, geocodeQuery])

  // El mapa se crea una sola vez por rama de entrega. Si dependiera de
  // `position` se destruiría y reconstruiría con cada coordenada nueva, y al
  // geocodificar mientras se escribe eso sería un parpadeo continuo.
  const initialPositionRef = useRef(position)

  useEffect(() => {
    if (deliveryType !== 'SHIP') return
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
          onAddressChangeRef.current({
            ...addressRef.current,
            latitude: Number(latLng.lat().toFixed(6)),
            longitude: Number(latLng.lng().toFixed(6)),
          })
        }

        // Clic en el mapa o arrastre del pin: ambos ajustan el punto.
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          marker.setPosition(event.latLng)
          commit(event.latLng)
        })

        marker.addListener('dragend', () => {
          const pos = marker.getPosition()
          if (pos) commit(pos)
        })

        setMapError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setMapError(err.message)
      })

    return () => {
      cancelled = true
      mapRef.current = null
      markerRef.current = null
    }
  }, [deliveryType])

  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return
    markerRef.current.setPosition(position)
    mapRef.current.panTo(position)
  }, [position])

  if (deliveryType === 'PICKUP') {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pickup-point"
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          Punto de recogida <span className="text-rose-500">*</span>
        </label>
        <select
          id="pickup-point"
          required
          disabled={disabled}
          value={pickupPointId}
          onChange={(event) =>
            onPickupPointChange(event.target.value === '' ? '' : Number(event.target.value))
          }
          className={inputClass}
        >
          <option value="">Selecciona un punto…</option>
          {pickupPoints.map((point) => (
            <option key={point.id} value={point.id}>
              {point.name}
              {point.city ? ` — ${point.city}` : ''}
            </option>
          ))}
        </select>
        {pickupPoints.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No hay puntos de recogida activos. Crea uno en Puntos físicos.
          </p>
        )}
      </div>
    )
  }

  const hasCoords = address.latitude !== null && address.longitude !== null

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Dirección"
        required
        disabled={disabled}
        value={address.line}
        placeholder="Ej. Cra 7 #140-20, apto 502"
        onChange={(line) => onAddressChange({ ...address, line })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Ciudad"
          required
          disabled={disabled}
          value={address.city}
          placeholder="Bogotá"
          onChange={(city) => onAddressChange({ ...address, city })}
        />
        <Field
          label="Departamento"
          required
          disabled={disabled}
          value={address.state}
          placeholder="Cundinamarca"
          onChange={(state) => onAddressChange({ ...address, state })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Código postal"
          disabled={disabled}
          value={address.postal_code ?? ''}
          placeholder="110111"
          onChange={(postal_code) => onAddressChange({ ...address, postal_code })}
        />
        <Field
          label="Indicaciones de entrega"
          disabled={disabled}
          value={address.instructions ?? ''}
          placeholder="Portería, torre 3"
          onChange={(instructions) => onAddressChange({ ...address, instructions })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Ubicación en el mapa <span className="text-rose-500">*</span>
        </span>
        <div
          ref={mapElementRef}
          className="h-64 w-full overflow-hidden rounded-md border border-slate-200 dark:border-white/10"
        />
        {mapError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            No se pudo cargar el mapa: {mapError}
          </p>
        )}

        {geocodeState === 'searching' && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Buscando la dirección…</p>
        )}

        {geocodeState === 'exact' && geocodedLabel && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Ubicada en: {geocodedLabel}
          </p>
        )}

        {geocodeState === 'approximate' && geocodedLabel && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Ubicación aproximada: {geocodedLabel}. Google no encontró el número exacto.{' '}
            <strong>Verifica el pin</strong> y ajústalo arrastrándolo o con un clic.
          </p>
        )}

        {geocodeState === 'notFound' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No encontramos esa dirección. Revísala o marca el punto en el mapa.
          </p>
        )}

        {geocodeState === 'error' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No pudimos buscar la dirección. Marca el punto en el mapa.
          </p>
        )}

        <p
          className={
            hasCoords
              ? 'text-xs text-slate-500 dark:text-slate-400'
              : 'text-xs text-amber-600 dark:text-amber-400'
          }
        >
          {hasCoords
            ? `Coordenadas: ${address.latitude}, ${address.longitude} · ajústalas arrastrando el pin`
            : 'Completa la dirección y la ubicaremos sola, o marca el punto en el mapa. Sin coordenadas el pedido no aparecerá en el mapa de asignación.'}
        </p>
      </div>
    </div>
  )
}
