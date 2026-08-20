/**
 * Carga del SDK de Google Maps (Maps JavaScript API).
 *
 * La clave va en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` y por definición viaja al
 * navegador; lo que la protege es la restricción por dominio configurada en
 * Google Cloud, no el secreto. La clave de la Geocoding API es OTRA y vive solo
 * en el backend (ver `services/geocoding.service.ts`).
 */

declare global {
  interface Window {
    google?: typeof google
    __rutaMapsPromise__?: Promise<void>
    __rutaMapsReady__?: () => void
  }
}

/** Centro de Colombia, usado mientras no hay punto elegido. */
export const DEFAULT_CENTER = { lat: 4.7109, lng: -74.0721 }

const SDK_ID = 'ruta-google-maps-sdk'
const CALLBACK_NAME = '__rutaMapsReady__' as const

export function getMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
}

/**
 * Inserta el SDK una sola vez por página. Varias vistas pueden pedirlo a la vez
 * (el mapa de asignación y un modal, por ejemplo), así que la promesa se
 * comparte en `window` en lugar de duplicar el script.
 */
export function ensureGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps) return Promise.resolve()
  if (window.__rutaMapsPromise__) return window.__rutaMapsPromise__

  const apiKey = getMapsApiKey()
  if (!apiKey) {
    return Promise.reject(
      new Error('Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el entorno del frontend'),
    )
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps')), {
        once: true,
      })
      return
    }

    // El evento `load` del script NO sirve: con `loading=async` la URL entrega un
    // bootstrap que solo define `google.maps.Load` y `modules`, y descarga las
    // clases después. Usar `load` deja `google.maps.Map` indefinido y el mapa
    // falla en silencio. `callback` es la señal de que la API ya está lista.
    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME]
      resolve()
    }

    const script = document.createElement('script')
    script.id = SDK_ID
    script.async = true
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&language=es&region=CO&loading=async&callback=${CALLBACK_NAME}`
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps')), {
      once: true,
    })
    document.head.appendChild(script)
  })

  window.__rutaMapsPromise__ = promise
  return promise
}
