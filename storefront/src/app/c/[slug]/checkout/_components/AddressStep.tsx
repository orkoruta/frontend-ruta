'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { DEFAULT_CENTER, ensureGoogleMaps } from '@/lib/google-maps'
import { mapStyles, prefersDark, watchColorScheme } from '@/lib/map_theme'
import { geocodeAddress } from '@/lib/geocoding'
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
  // Se guarda en ref para que el efecto de geocoding no dependa de la identidad
  // del callback y se re-dispare en cada render.
  const onAddressChangeRef = useRef(onAddressChange)
  // Última búsqueda hecha: un clic o arrastre en el mapa no cambia el texto, así
  // que no debe re-geocodificar y pisar el punto que el comprador acaba de elegir.
  const lastQueryRef = useRef<string | null>(null)

  const [geocodeState, setGeocodeState] = useState<
    'idle' | 'searching' | 'exact' | 'approximate' | 'notFound' | 'error'
  >('idle')

  useEffect(() => {
    addressRef.current = address
    deliveryTypeRef.current = deliveryType
    onAddressChangeRef.current = onAddressChange
  }, [address, deliveryType, onAddressChange])

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
    let unwatchTheme: (() => void) | null = null

    ensureGoogleMaps()
      .then(() => {
        if (cancelled || !window.google || !mapElementRef.current || mapRef.current) return

        const map = new window.google.maps.Map(mapElementRef.current, {
          center: initialPositionRef.current,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // Tema del mapa según el del sistema. Los POIs se conservan: ayudan al
          // comprador a reconocer dónde está marcando su casa.
          styles: mapStyles({ dark: prefersDark() }),
        })

        unwatchTheme = watchColorScheme((dark) => {
          map.setOptions({ styles: mapStyles({ dark }) })
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
      unwatchTheme?.()
    }
  }, [onAddressChange])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    mapRef.current.panTo(position)
    markerRef.current.setPosition(position)
  }, [position])

  // Geocodifica la dirección escrita y mueve el mapa al punto. Antes solo se
  // podía ajustar con clic; ahora al escribir la dirección se ubica sola.
  const geocodeKey = useMemo(
    () =>
      [address.line.trim(), address.city.trim(), address.state.trim(), address.postal_code?.trim() ?? '']
        .join('|'),
    [address.line, address.city, address.state, address.postal_code],
  )

  useEffect(() => {
    if (deliveryType !== 'SHIP') {
      setGeocodeState('idle')
      return
    }

    const [line, city, state, postal] = geocodeKey.split('|')
    // Con calle y ciudad ya se puede buscar; el resto afina.
    if (!line || !city) {
      setGeocodeState('idle')
      return
    }
    // Mismo texto que la última búsqueda (p.ej. tras un clic en el mapa): no
    // repetir la consulta ni pisar el punto elegido a mano.
    if (geocodeKey === lastQueryRef.current) return

    const controller = new AbortController()
    // Debounce: cada consulta a Google se cobra, así que no se dispara por tecla.
    const timer = window.setTimeout(async () => {
      setGeocodeState('searching')
      try {
        const result = await geocodeAddress(
          { street: line, city, state, postalCode: postal || undefined },
          controller.signal,
        )
        lastQueryRef.current = geocodeKey

        if (!result) {
          setGeocodeState('notFound')
          return
        }

        setGeocodeState(result.isPrecise ? 'exact' : 'approximate')
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
  }, [deliveryType, geocodeKey])

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
                    {/* `address` ya incluye la ciudad ("línea, ciudad"). */}
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {point.address}
                    </p>
                  </div>
                  {selected && <RutaPill variant="blue">Elegido</RutaPill>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200/90 dark:border-white/10">
        <div ref={mapElementRef} className="h-72 w-full bg-slate-100 dark:bg-[#181a1e]" />
      </div>
      {deliveryType === 'SHIP' ? (
        <div className="mt-2 text-xs">
          {geocodeState === 'searching' && (
            <p className="text-slate-500 dark:text-slate-400">Buscando la dirección…</p>
          )}
          {geocodeState === 'exact' && (
            <p className="text-emerald-600 dark:text-emerald-400">
              ✓ Ubicamos tu dirección. Si el pin no cae exacto, arrástralo o toca el mapa.
            </p>
          )}
          {geocodeState === 'approximate' && (
            <p className="text-amber-600 dark:text-amber-400">
              Ubicación aproximada: no encontramos el número exacto. Ajusta el pin en el mapa.
            </p>
          )}
          {geocodeState === 'notFound' && (
            <p className="text-amber-600 dark:text-amber-400">
              No encontramos esa dirección. Revísala o marca el punto en el mapa.
            </p>
          )}
          {geocodeState === 'error' && (
            <p className="text-rose-600 dark:text-rose-400">
              No pudimos buscar la dirección. Marca el punto en el mapa.
            </p>
          )}
          {geocodeState === 'idle' && (
            <p className="text-slate-500 dark:text-slate-400">
              Escribe tu dirección y la ubicaremos en el mapa. También puedes tocar el mapa para ajustarla.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          El mapa muestra el punto físico seleccionado.
        </p>
      )}
    </RutaCard>
  )
}
