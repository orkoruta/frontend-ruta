/**
 * Geocodificación de direcciones.
 *
 * Llama al proxy del backend (`GET /geocode`), no a Google directamente: la
 * clave de la Geocoding API solo se puede restringir por IP, así que vive en el
 * servidor. El backend además cachea 24 h, y cada consulta a Google se cobra.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface GeocodeQuery {
  street: string
  city: string
  state?: string
  postalCode?: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  /** Dirección normalizada tal como la reconoció Google. */
  formattedAddress: string
  /** `false` cuando Google ubicó la vía o el sector en vez del predio. */
  isPrecise: boolean
  /** Código postal del punto, si Google lo conoce. */
  postalCode: string | null
}

interface GeocodeResponse {
  data: {
    latitude: number
    longitude: number
    formatted_address: string
    is_precise: boolean
    postal_code: string | null
  } | null
}

function toResult(d: NonNullable<GeocodeResponse['data']>): GeocodeResult {
  return {
    latitude: d.latitude,
    longitude: d.longitude,
    formattedAddress: d.formatted_address,
    isPrecise: d.is_precise,
    postalCode: d.postal_code ?? null,
  }
}

/**
 * Devuelve la mejor coincidencia, o `null` si la dirección no se reconoce.
 * Propaga `AbortError` si se cancela: el llamador debe ignorarlo.
 */
export async function geocodeAddress(
  query: GeocodeQuery,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const address = [query.street, query.city, query.state, query.postalCode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')

  if (!address) return null

  const res = await fetch(`${API_BASE}/geocode?address=${encodeURIComponent(address)}`, {
    signal,
    credentials: 'include',
  })

  if (!res.ok) throw new Error('No pudimos buscar la dirección')

  const body = (await res.json()) as GeocodeResponse
  return body.data ? toResult(body.data) : null
}

/**
 * Geocodificación inversa: de coordenadas a dirección. Se usa para sacar el
 * código postal del punto donde el comprador dejó el pin en el mapa.
 * Propaga `AbortError` si se cancela.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const res = await fetch(`${API_BASE}/geocode/reverse?lat=${lat}&lng=${lng}`, {
    signal,
    credentials: 'include',
  })

  if (!res.ok) throw new Error('No pudimos ubicar el código postal')

  const body = (await res.json()) as GeocodeResponse
  return body.data ? toResult(body.data) : null
}
