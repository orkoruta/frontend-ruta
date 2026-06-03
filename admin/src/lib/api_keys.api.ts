const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface ApiKey {
  id: bigint
  key_id: string          // 'rk_...'
  name: string
  scopes: string[]        // ['orders:write', 'orders:read']
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface CreateApiKeyInput {
  name: string
  scopes: string[]
  expires_at?: string
}

export interface CreateApiKeyResult {
  key_id: string
  secret: string
  scopes: string[]
  name: string
}

export interface ApiKeyListResponse {
  data: ApiKey[]
}

export interface ApiKeysApiError {
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

async function parseError(res: Response): Promise<ApiKeysApiError> {
  try {
    return (await res.json()) as ApiKeysApiError
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

export function listApiKeys(): Promise<ApiKey[]> {
  return request<ApiKeyListResponse>('/admin/api-keys').then((r) => r.data)
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  return request<CreateApiKeyResult>('/admin/api-keys', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(input),
  })
}

export function revokeApiKey(keyId: string, reason?: string): Promise<void> {
  return request<void>(`/admin/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    ...(reason ? { body: JSON.stringify({ reason }) } : {}),
  })
}
