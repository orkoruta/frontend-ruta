const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface Parameter {
  parameter_key: string
  parameter_value: string
  group: string
  description?: string
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

export function getParameters(group?: string): Promise<Parameter[]> {
  const query = group ? `?group=${encodeURIComponent(group)}` : ''
  return request<Parameter[]>(`/admin/parameters${query}`)
}

export function updateParameter(key: string, value: string): Promise<Parameter> {
  return request<Parameter>(`/admin/parameters/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ parameter_value: value }),
  })
}
