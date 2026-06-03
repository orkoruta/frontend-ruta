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

export interface Return {
  id: number
  order_id: number
  buyer_id: number
  buyer_name: string | null
  buyer_email: string | null
  return_mechanism: ReturnMechanism
  return_status: ReturnStatus
  reason: string | null
  rejection_reason: string | null
  courier_id: number | null
  created_at: string
  updated_at: string
}

export interface ReturnListFilters {
  status?: ReturnStatus
  return_mechanism?: ReturnMechanism
  page?: number
  page_size?: number
}

export interface ReturnListResponse {
  data: Return[]
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

function buildQuery(filters: ReturnListFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.return_mechanism) params.set('return_mechanism', filters.return_mechanism)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function listReturns(filters: ReturnListFilters = {}): Promise<ReturnListResponse> {
  return request<ReturnListResponse>(`/admin/returns${buildQuery(filters)}`)
}

export function getReturn(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}`)
}

export function startReview(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/review`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function approveReturn(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/approve`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function rejectReturn(id: number, reason: string): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/reject`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reason }),
  })
}

export function schedulePickup(id: number, courierId: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/schedule-pickup`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ courier_id: courierId }),
  })
}

export function markReceived(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/mark-received`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function markLost(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/mark-lost`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function cancelReturn(id: number): Promise<Return> {
  return request<Return>(`/admin/returns/${id}/cancel`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
