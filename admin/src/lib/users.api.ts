const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface Pagination {
  page: number
  limit: number
  total: number
  total_pages?: number
}

export interface ListResponse<T> {
  data: T[]
  pagination?: Pagination
}

export interface Buyer {
  id: number
  email: string
  full_name: string
  phone?: string | null
  document_type?: string | null
  document_number?: string | null
  status?: string | null
  created_at?: string | null
  addresses?: BuyerAddress[]
  orders?: OrderSummary[]
}

export interface BuyerAddress {
  id?: number
  line?: string
  city?: string
  state?: string
  instructions?: string | null
}

export interface Courier {
  id: number
  email?: string | null
  full_name: string
  phone?: string | null
  document_type?: string | null
  document_number?: string | null
  vehicle_type?: string | null
  status?: string | null
  created_at?: string | null
  metrics?: CourierMetrics
  orders?: OrderSummary[]
}

export interface CourierMetrics {
  completed_deliveries?: number
  success_rate?: number
  average_delivery_minutes?: number
  active_orders?: number
}

export interface PickupPoint {
  id: number
  name: string
  address: string
  city?: string | null
  state?: string | null
  phone?: string | null
  schedule?: string | null
  latitude?: number | null
  longitude?: number | null
  status?: string | null
}

export interface OrderSummary {
  id: number
  order_status?: string | null
  total?: number | null
  created_at?: string | null
}

type QueryValue = string | number | boolean | null | undefined
type RequestBody = Record<string, unknown>

function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
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

async function apiFetch<T>(
  path: string,
  options: RequestInit & { bodyJson?: RequestBody } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.bodyJson) {
    headers.set('Content-Type', 'application/json')
  }
  if (
    options.method &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())
  ) {
    headers.set('X-Idempotency-Key', idempotencyKey())
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.bodyJson ? JSON.stringify(options.bodyJson) : options.body,
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function listPath(path: string, params: Record<string, QueryValue>) {
  return `${path}${toQuery(params)}`
}

export function listBuyers(params: Record<string, QueryValue> = {}) {
  return apiFetch<ListResponse<Buyer>>(listPath('/admin/buyers', params))
}

export function getBuyer(id: string) {
  return apiFetch<Buyer>(`/admin/buyers/${id}`)
}

export function updateBuyer(id: string, body: RequestBody) {
  return apiFetch<Buyer>(`/admin/buyers/${id}`, { method: 'PATCH', bodyJson: body })
}

export function listCouriers(params: Record<string, QueryValue> = {}) {
  return apiFetch<ListResponse<Courier>>(listPath('/admin/couriers', params))
}

export function getCourier(id: string) {
  return apiFetch<Courier>(`/admin/couriers/${id}`)
}

export function createCourier(body: RequestBody) {
  return apiFetch<Courier>('/admin/couriers', { method: 'POST', bodyJson: body })
}

export function updateCourier(id: string, body: RequestBody) {
  return apiFetch<Courier>(`/admin/couriers/${id}`, { method: 'PATCH', bodyJson: body })
}

export function listPickupPoints(params: Record<string, QueryValue> = {}) {
  return apiFetch<ListResponse<PickupPoint>>(listPath('/admin/pickup-points', params))
}

export function getPickupPoint(id: string) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}`)
}

export function createPickupPoint(body: RequestBody) {
  return apiFetch<PickupPoint>('/admin/pickup-points', { method: 'POST', bodyJson: body })
}

export function updatePickupPoint(id: string, body: RequestBody) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}`, {
    method: 'PATCH',
    bodyJson: body,
  })
}

export function deletePickupPoint(id: string) {
  return apiFetch<void>(`/admin/pickup-points/${id}`, { method: 'DELETE' })
}
