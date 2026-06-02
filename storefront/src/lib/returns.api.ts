const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type ReturnStatus =
  | 'RETURN_REQUESTED'
  | 'RETURN_UNDER_REVIEW'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'CUSTOMER_RETURN_IN_TRANSIT'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_COLLECTED'
  | 'RETURN_RECEIVED'
  | 'RETURN_LOST'
  | 'RETURN_CANCELLED'

export type ReturnMechanism = 'BUYER_SHIPS_VIA_COURIER' | 'CLIENT_PICKS_UP'

export interface ReturnRequest {
  id: number
  order_id: number
  return_status: ReturnStatus
  return_mechanism: ReturnMechanism | null
  reason: string | null
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

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
    return { code: 'REQUEST_FAILED', message: 'No pudimos completar la solicitud.' }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function requestReturn(
  orderId: number,
  data: { reason: string; buyer_complaint?: string },
): Promise<ReturnRequest> {
  return request<ReturnRequest>(`/buyer/orders/${orderId}/request-return`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  })
}

export function getOrderReturn(orderId: number): Promise<ReturnRequest> {
  return request<ReturnRequest>(`/buyer/orders/${orderId}/return`)
}
