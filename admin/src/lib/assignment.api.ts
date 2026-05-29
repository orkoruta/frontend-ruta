const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapOrder {
  id: number
  order_status: string
  delivery_address_line: string
  delivery_address_city: string
  latitude: number
  longitude: number
  buyer_id: number
  total: number
  currency: string
  created_at: string
}

export interface AvailableCourier {
  id: number
  full_name: string
  email: string
  phone: string | null
  status: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    return (await res.json()) as ApiError
  } catch {
    return {
      code: 'REQUEST_FAILED',
      message: 'No pudimos completar la solicitud.',
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ─── API functions ────────────────────────────────────────────────────────────

export function getOrdersForMap(): Promise<MapOrder[]> {
  return request<{ data: MapOrder[] }>('/admin/orders/map').then((r) => r.data)
}

export function getAvailableCouriers(orderId: number): Promise<AvailableCourier[]> {
  return request<{ data: AvailableCourier[] }>(
    `/admin/orders/${orderId}/available-couriers`,
  ).then((r) => r.data)
}

export function assignCourier(orderId: number, courierUserId: number): Promise<void> {
  return request<void>(`/admin/orders/${orderId}/assign-courier`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ courier_user_id: courierUserId }),
  })
}

export function unassignCourier(orderId: number): Promise<void> {
  return request<void>(`/admin/orders/${orderId}/unassign-courier`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
