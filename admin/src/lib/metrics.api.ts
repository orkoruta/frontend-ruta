const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface OrdersByStatus {
  status: string
  count: number
}

export interface ClientMetrics {
  orders_today: number
  orders_by_status: OrdersByStatus[]
  revenue_last_7_days: number
  active_couriers: number
  registered_buyers: number
}

export interface ClientsByType {
  client_type: string
  count: number
}

export interface GlobalMetrics {
  active_clients_by_type: ClientsByType[]
  orders_today: number
  orders_by_status: OrdersByStatus[]
  revenue_last_7_days: number
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

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  })

  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export function getClientMetrics(): Promise<ClientMetrics> {
  return request<ClientMetrics>('/admin/metrics')
}

export function getGlobalMetrics(): Promise<GlobalMetrics> {
  return request<GlobalMetrics>('/ruta-admin/metrics')
}
