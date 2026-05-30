const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface AuditEvent {
  id: number
  event_type: string
  entity_type: string
  entity_id: string | null
  user_id: number | null
  user_email: string | null
  description: string | null
  occurred_at: string
  client_id: number
}

export interface AuditFilters {
  entity_type?: string
  user_id?: number
  from?: string
  to?: string
  page?: number
  page_size?: number
}

export interface AuditListResponse {
  items: AuditEvent[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
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

function buildAuditQuery(filters: AuditFilters & { client_id?: number }): string {
  const params = new URLSearchParams()

  if (filters.entity_type) params.set('entity_type', filters.entity_type)
  if (filters.user_id) params.set('user_id', String(filters.user_id))
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.client_id) params.set('client_id', String(filters.client_id))

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function getAuditEvents(filters: AuditFilters = {}): Promise<AuditListResponse> {
  return request<AuditListResponse>(`/admin/audit-events${buildAuditQuery(filters)}`)
}

export function getRutaAdminAuditEvents(
  filters: AuditFilters & { client_id?: number } = {},
): Promise<AuditListResponse> {
  return request<AuditListResponse>(`/ruta-admin/audit-events${buildAuditQuery(filters)}`)
}
