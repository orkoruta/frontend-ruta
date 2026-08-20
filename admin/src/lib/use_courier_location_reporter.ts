'use client'

import { useEffect, useRef, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/** Cada cuánto se manda la posición. Más seguido gasta batería sin aportar. */
const REPORT_INTERVAL_MS = 20_000

export type ReporterState =
  | 'off'
  /** Esperando a que el GPS dé una lectura. */
  | 'locating'
  /** Hay lectura y el servidor la aceptó: el comprador la está viendo. */
  | 'sharing'
  /** Hay lectura pero no llega al servidor (sin red, API caída). */
  | 'unreachable'
  | 'denied'
  | 'unavailable'

/**
 * Reporta la posición del repartidor mientras lleva un pedido en camino.
 *
 * El estado que devuelve refleja **si el envío llegó**, no si el GPS funciona.
 * La distinción importa: una primera versión decía "el comprador está viendo tu
 * ubicación" en cuanto `watchPosition` daba una lectura, aunque el POST fallara.
 * Con la API caída el repartidor veía ese mensaje mientras el comprador no
 * recibía nada. Prometerle a alguien que está siendo visto cuando no lo está es
 * peor que no decir nada.
 *
 * **Limitación de fondo, y no es un fallo de esta implementación:** el panel del
 * repartidor es una página web. `watchPosition` solo corre con la pestaña en
 * primer plano; si bloquea el teléfono o se va a Waze —cosa que la propia
 * pantalla le invita a hacer— el navegador suspende los temporizadores y deja de
 * reportar. El comprador ve entonces la última posición conocida, con su hora.
 * Un seguimiento continuo de verdad necesita app nativa con permiso en segundo
 * plano.
 *
 * Requiere contexto seguro (HTTPS o localhost); en HTTP el navegador ni pide
 * permiso.
 */
export function useCourierLocationReporter(active: boolean): ReporterState {
  const [state, setState] = useState<ReporterState>('off')
  // La última lectura del GPS. Se manda por temporizador y no en cada cambio:
  // `watchPosition` puede disparar varias veces por segundo.
  const lastFixRef = useRef<GeolocationPosition | null>(null)
  // Para no pisar 'denied'/'unavailable' con el resultado de un envío tardío.
  const deniedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      setState('off')
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('unavailable')
      return
    }

    deniedRef.current = false
    setState('locating')

    async function send() {
      const fix = lastFixRef.current
      if (!fix || deniedRef.current) return
      try {
        const res = await fetch(`${API_BASE}/courier/location`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: Number(fix.coords.latitude.toFixed(6)),
            longitude: Number(fix.coords.longitude.toFixed(6)),
            accuracy: fix.coords.accuracy,
          }),
        })
        if (!res.ok) {
          setState('unreachable')
          return
        }
        // El servidor descarta lecturas muy imprecisas: eso no es "compartiendo".
        const body = (await res.json()) as { accepted?: boolean }
        setState(body.accepted === false ? 'locating' : 'sharing')
      } catch {
        // Sin red o API caída. Se refleja en pantalla en vez de callarlo: el
        // repartidor tiene que poder notar que no está llegando nada.
        setState('unreachable')
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const isFirstFix = lastFixRef.current === null
        lastFixRef.current = position
        // Se manda en cuanto llega la primera lectura, sin esperar al primer
        // tick: si no, el comprador no vería nada durante los primeros 20 s.
        if (isFirstFix) void send()
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          deniedRef.current = true
          setState('denied')
          return
        }
        // Sin señal o timeout son transitorios: el GPS suele recuperarse, así
        // que no se apaga el indicador, solo se vuelve a "buscando".
        if (!lastFixRef.current) setState('locating')
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    )

    const timer = setInterval(() => void send(), REPORT_INTERVAL_MS)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      clearInterval(timer)
    }
  }, [active])

  return state
}
