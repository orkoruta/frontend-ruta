const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type LoginPayload = {
  client_slug: string
  email: string
  password: string
}

export type LoginResponse = {
  user_id: number
  client_id: number
  user_type: string
  expires_in_seconds: number
}

export type RegisterPayload = {
  client_slug: string
  email: string
  password: string
  full_name: string
  phone: string
  document_type: string
  document_number: string
}

export type RegisterResponse = {
  user_id: number
  client_id: number
  email: string
  user_type: string
}

type ApiErrorBody = {
  code: string
  message: string
  details?: unknown
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // response body may be empty
    }
    throw new Error(body?.message ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function loginBuyer(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return handleResponse<LoginResponse>(res)
}

export async function registerBuyer(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return handleResponse<RegisterResponse>(res)
}

export async function logoutBuyer(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // empty
    }
    throw new Error(body?.message ?? `Error ${res.status}`)
  }
}
