const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROVIDER_REQUESTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED'

export type RefundModality = 'STORE_CREDIT' | 'BANK_REFUND'

export type RefundResult = 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED'

export interface Refund {
  id: number
  order_id: number
  refund_modality: RefundModality
  amount: number
  currency: string
  status: RefundStatus
  executed_at: string | null
  external_provider_refund_id: string | null
  evidence: unknown
  reason: string | null
  created_at: string
  updated_at: string
}

export interface RefundListFilters {
  status?: RefundStatus
  from?: string
  to?: string
  page?: number
  page_size?: number
}

export interface RefundListResponse {
  data: Refund[]
  pagination: { page: number; page_size: number; total: number }
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
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function buildQuery(filters: RefundListFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function listRefunds(filters: RefundListFilters = {}): Promise<RefundListResponse> {
  return request<RefundListResponse>(`/admin/refunds${buildQuery(filters)}`)
}

export function getRefund(refundId: number): Promise<Refund> {
  return request<Refund>(`/admin/refunds/${refundId}`)
}

export function initiateRefund(
  orderId: number,
  amount: number,
  refund_modality: RefundModality,
  reason?: string,
): Promise<Refund> {
  return request<Refund>(`/admin/orders/${orderId}/initiate-refund`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ amount, refund_modality, reason }),
  })
}

export function processRefund(refundId: number): Promise<Refund> {
  return request<Refund>(`/admin/refunds/${refundId}/process`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function requestProviderRefund(refundId: number): Promise<Refund> {
  return request<Refund>(`/admin/refunds/${refundId}/request-provider`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function markRefundExecuted(
  refundId: number,
  result: RefundResult,
  amount_executed?: number,
  external_provider_refund_id?: string,
): Promise<Refund> {
  return request<Refund>(`/admin/refunds/${refundId}/mark-executed`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ result, amount_executed, external_provider_refund_id }),
  })
}
