const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface CourierLocation {
  latitude: number
  longitude: number
  /** Cuándo se tomó la posición. */
  updated_at: string
  age_seconds: number
  /** `true` = la posición ya no es de fiar y hay que decirlo, no disimularlo. */
  is_stale: boolean
  courier_name: string | null
  destination: { latitude: number; longitude: number } | null
}

/**
 * Posición del repartidor del pedido.
 *
 * Devuelve `null` en cualquier caso sin seguimiento: pedido fuera de reparto,
 * sin repartidor, sin posición reportada o ajeno. El backend responde 404 para
 * todos por igual —distinguirlos dejaría sondear pedidos de otros— así que aquí
 * un 404 no es un error: es "todavía no hay nada que mostrar".
 */
export async function getCourierLocation(orderId: number): Promise<CourierLocation | null> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}/courier-location`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('No pudimos cargar la ubicación del repartidor')
  return (await res.json()) as CourierLocation
}
