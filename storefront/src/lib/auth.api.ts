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

export type BuyerProfile = {
  id: number
  full_name: string | null
  email: string
  phone: string | null
  /** Sesión de invitado (sin cuenta): se le oculta "Mis pedidos" y recurrencia. */
  is_guest?: boolean
}

function idemKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Inicia una sesión de invitado (sin cuenta) para poder pedir. */
export async function startGuestSession(
  clientSlug: string,
  contact?: { full_name?: string; phone?: string },
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idemKey() },
    body: JSON.stringify({ client_slug: clientSlug, ...contact }),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
}

/** Actualiza nombre/teléfono del comprador (el invitado registra su contacto). */
export async function updateBuyerProfile(input: {
  full_name?: string
  phone?: string
}): Promise<BuyerProfile> {
  const res = await fetch(`${API_BASE}/buyer/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idemKey() },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return (await res.json()) as BuyerProfile
}

/**
 * Perfil del comprador autenticado. Devuelve `null` si no hay sesión (401), sin
 * lanzar: la home la usa cualquiera, con sesión o sin ella.
 */
export async function getBuyerProfile(): Promise<BuyerProfile | null> {
  const res = await fetch(`${API_BASE}/buyer/me`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return (await res.json()) as BuyerProfile
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
