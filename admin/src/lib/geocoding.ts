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
}

interface GeocodeResponse {
  data: {
    latitude: number
    longitude: number
    formatted_address: string
    is_precise: boolean
  } | null
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
  if (!body.data) return null

  return {
    latitude: body.data.latitude,
    longitude: body.data.longitude,
    formattedAddress: body.data.formatted_address,
    isPrecise: body.data.is_precise,
  }
}
