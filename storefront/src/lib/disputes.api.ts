const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type DisputeStatus =
  | 'DISPUTED'
  | 'DISPUTE_UNDER_REVIEW'
  | 'DISPUTE_RESOLVED_NO_ACTION'
  | 'DISPUTE_RESOLVED_WITH_RETURN'
  | 'DISPUTE_RESOLVED_WITH_REFUND'

export interface BuyerDisputeResponse {
  id: string
  status: DisputeStatus
  reason: string
  created_at: string
}

interface ApiError {
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

export function openDispute(
  orderId: string,
  data: { reason: string; evidence?: string },
): Promise<BuyerDisputeResponse> {
  return request<BuyerDisputeResponse>(`/buyer/orders/${orderId}/dispute`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(data),
  })
}

export function getOrderDispute(orderId: string): Promise<BuyerDisputeResponse> {
  return request<BuyerDisputeResponse>(`/buyer/orders/${orderId}/dispute`)
}
