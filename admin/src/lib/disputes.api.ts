const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type DisputeStatus =
  | 'DISPUTED'
  | 'DISPUTE_UNDER_REVIEW'
  | 'DISPUTE_RESOLVED_NO_ACTION'
  | 'DISPUTE_RESOLVED_WITH_RETURN'
  | 'DISPUTE_RESOLVED_WITH_REFUND'

export type DisputeAction = 'NO_ACTION' | 'WITH_RETURN' | 'WITH_REFUND'

export interface Dispute {
  id: number
  order_id: number
  buyer_id: number
  buyer_name: string | null
  buyer_email: string | null
  status: DisputeStatus
  reason: string | null
  resolution: string | null
  resolved_action: DisputeAction | null
  refund_amount: number | null
  created_at: string
  updated_at: string
}

export interface DisputeListFilters {
  status?: DisputeStatus
  page?: number
  page_size?: number
}

export interface DisputeListResponse {
  data: Dispute[]
  pagination: { page: number; page_size: number; total: number }
}

export interface ResolveDisputeBody {
  action: DisputeAction
  resolution: string
  amount?: number
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

function buildQuery(filters: DisputeListFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function listDisputes(filters: DisputeListFilters = {}): Promise<DisputeListResponse> {
  return request<DisputeListResponse>(`/admin/disputes${buildQuery(filters)}`)
}

export function getDispute(id: number): Promise<Dispute> {
  return request<Dispute>(`/admin/disputes/${id}`)
}

export function startDisputeReview(id: number): Promise<Dispute> {
  return request<Dispute>(`/admin/disputes/${id}/review`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function resolveDispute(id: number, body: ResolveDisputeBody): Promise<Dispute> {
  return request<Dispute>(`/admin/disputes/${id}/resolve`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(body),
  })
}
