const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type ClientType = 'API' | 'FULL'
export type ClientStatus = 'ACTIVE' | 'INACTIVE'
export type FrontendMode = 'NATIVE_RUTA' | 'CUSTOM_LANDING_BY_RUTA'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface RutaClient {
  id: number
  business_code: string
  slug: string
  name: string
  description: string | null
  client_type: ClientType
  frontend_mode: FrontendMode | null
  status: ClientStatus
  created_at: string
  updated_at: string
}

export interface ClientListFilters {
  q?: string
  client_type?: ClientType
  status?: ClientStatus
  page?: number
  page_size?: number
}

export interface ClientListResponse {
  data: RutaClient[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface ClientPayload {
  business_code: string
  slug: string
  name: string
  description?: string
  client_type: ClientType
  frontend_mode?: FrontendMode | null
}

export interface ClientUpdatePayload {
  business_code?: string
  slug?: string
  name?: string
  description?: string
  client_type?: ClientType
  frontend_mode?: FrontendMode | null
  status?: ClientStatus
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildQuery(filters: ClientListFilters): string {
  const params = new URLSearchParams()

  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.client_type) params.set('client_type', filters.client_type)
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))

  const query = params.toString()
  return query ? `?${query}` : ''
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

export function listClients(filters: ClientListFilters = {}): Promise<ClientListResponse> {
  return request<ClientListResponse>(`/ruta-admin/clients${buildQuery(filters)}`)
}

export function getClient(clientId: number): Promise<RutaClient> {
  return request<RutaClient>(`/ruta-admin/clients/${clientId}`)
}

export function createClient(payload: ClientPayload): Promise<RutaClient> {
  return request<RutaClient>('/ruta-admin/clients', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  })
}

export function updateClient(
  clientId: number,
  payload: ClientUpdatePayload,
): Promise<RutaClient> {
  return request<RutaClient>(`/ruta-admin/clients/${clientId}`, {
    method: 'PATCH',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  })
}

export function activateClient(clientId: number): Promise<RutaClient> {
  return request<RutaClient>(`/ruta-admin/clients/${clientId}/activate`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function deactivateClient(clientId: number): Promise<RutaClient> {
  return request<RutaClient>(`/ruta-admin/clients/${clientId}/deactivate`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function purgeClient(clientId: number): Promise<void> {
  return request<void>(`/ruta-admin/clients/${clientId}`, {
    method: 'DELETE',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
