/**
 * Tema claro/oscuro para Google Maps, siguiendo el del sistema operativo.
 *
 * Google Maps NO cambia de tema solo: hay que pasarle un array de `styles`. La
 * app sigue el tema del SO vía `prefers-color-scheme` (no hay toggle manual), así
 * que aquí se decide el estilo del mapa igual, y se ofrece un watcher para
 * repintarlo si el usuario cambia el tema con el mapa ya abierto.
 *
 * Copia idéntica en admin y storefront: son paquetes separados y el estilo es
 * dato plano, no lógica compartible por `@orkoruta/ui`.
 */

/** Estilo oscuro del mapa. Basado en el "night mode" estándar de Google. */
const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2025' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2025' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4b4f56' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c9ccd1' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3036' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#22262b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8b9096' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3f46' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2a2e34' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17191d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515660' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#212429' }] },
]

/** Oculta los POIs de Google (comercios, parques, transporte) y sus etiquetas. */
const HIDE_POIS_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

interface MapStyleOptions {
  dark: boolean
  /** Deja el mapa como lienzo para marcadores propios (sin POIs de Google). */
  hidePois?: boolean
}

export function mapStyles({ dark, hidePois }: MapStyleOptions): google.maps.MapTypeStyle[] {
  return [...(dark ? DARK_STYLES : []), ...(hidePois ? HIDE_POIS_STYLES : [])]
}

/** ¿El sistema está en modo oscuro ahora mismo? */
export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Llama a `onChange` cada vez que el SO cambia entre claro y oscuro. Devuelve una
 * función para dejar de escuchar.
 */
export function watchColorScheme(onChange: (dark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (event: MediaQueryListEvent) => onChange(event.matches)
  media.addEventListener('change', handler)
  return () => media.removeEventListener('change', handler)
}
