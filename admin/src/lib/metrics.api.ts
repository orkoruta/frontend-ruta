import { notifyUnauthorized } from './session-events'

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

  if (res.status === 401) notifyUnauthorized()
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export function getClientMetrics(): Promise<ClientMetrics> {
  return request<ClientMetrics>('/admin/metrics')
}

export function getGlobalMetrics(): Promise<GlobalMetrics> {
  return request<GlobalMetrics>('/ruta-admin/metrics')
}

// ── Dashboard operativo: por entregar / entregados ───────────────────────────

export interface DashboardBucket {
  count: number
  total_amount: number
}

export interface DashboardOrder {
  id: number
  order_status: string
  payment_status: string
  payment_method: string
  delivery_type: string
  buyer_name: string
  buyer_phone: string | null
  courier_id: number | null
  courier_name: string | null
  address: string | null
  total: number
  units: number
  scheduled_delivery_date: string | null
  created_at: string
  delivered_at: string | null
  /** Día que lo ubica en el tablero (entrega programada, creación o entrega). */
  day: string
  /** Por entregar con un día anterior al rango. */
  overdue: boolean
  items: { product_name: string; sku: string | null; quantity: number }[]
}

export interface DashboardSection {
  count: number
  total_amount: number
  units: number
  by_status: (DashboardBucket & { status: string })[]
  by_courier: (DashboardBucket & { courier_id: number | null; courier_name: string })[]
  by_day: (DashboardBucket & { date: string })[]
  by_payment_method: (DashboardBucket & { payment_method: string })[]
  products: {
    product_id: number | null
    product_name: string
    sku: string | null
    quantity: number
    orders: number
    amount: number
  }[]
  truncated: boolean
  orders: DashboardOrder[]
}

export interface OperationsDashboard {
  date_from: string
  date_to: string
  today: string
  include_backlog: boolean
  pending: DashboardSection & {
    backlog_count: number
    backlog_amount: number
    undated_count: number
  }
  delivered: DashboardSection
}

export interface OperationsDashboardFilters {
  date_from: string
  date_to: string
  courier_id?: number
  delivery_type?: 'SHIP' | 'PICKUP'
  include_backlog?: boolean
}

export function getOperationsDashboard(filters: OperationsDashboardFilters): Promise<OperationsDashboard> {
  const params = new URLSearchParams({ date_from: filters.date_from, date_to: filters.date_to })
  if (filters.courier_id) params.set('courier_id', String(filters.courier_id))
  if (filters.delivery_type) params.set('delivery_type', filters.delivery_type)
  if (filters.include_backlog) params.set('include_backlog', 'true')
  return request<OperationsDashboard>(`/admin/metrics/operations?${params.toString()}`)
}
