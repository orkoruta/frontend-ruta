const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface LoginResponse {
  user_id: number
  client_id: number | null
  user_type: 'ADMIN_RUTA' | 'ADMIN_CLIENT' | 'OPERATOR_CLIENT' | 'COURIER' | 'BUYER'
  expires_in_seconds: number
  acting_via_control_view?: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export async function loginClient(
  email: string,
  password: string,
  clientSlug: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_slug: clientSlug, email, password }),
    credentials: 'include',
  })
  if (!res.ok) throw (await res.json()) as ApiError
  return res.json()
}

export async function loginRutaAdmin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/ruta-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  if (!res.ok) throw (await res.json()) as ApiError
  return res.json()
}

export async function refreshToken(): Promise<{ expires_in_seconds: number }> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw (await res.json()) as ApiError
  return res.json()
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}
