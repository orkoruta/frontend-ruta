const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type WebhookDeliveryStatus = 'DELIVERED' | 'FAILED'

export interface WebhookDelivery {
  id: number
  client_id: number
  subscription_id: number
  subscription_url: string
  event_type: string
  event_id: string
  payload: unknown
  attempt_number: number
  status: WebhookDeliveryStatus
  response_status: number | null
  response_body: string | null
  delivered_at: string | null
  next_retry_at: string | null
  failed_permanently: boolean
  created_at: string
}

export interface WebhookDeliveryFilters {
  status?: WebhookDeliveryStatus
  from?: string
  to?: string
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

export function getWebhookDeliveries(
  filters?: WebhookDeliveryFilters,
): Promise<WebhookDelivery[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  const query = params.toString()
  return request<WebhookDelivery[]>(`/admin/webhook-deliveries${query ? `?${query}` : ''}`)
}

export function retryDelivery(deliveryId: number): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/admin/webhook-deliveries/${deliveryId}/retry`,
    {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey() },
    },
  )
}
