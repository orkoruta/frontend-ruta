const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_CONFIRM'
  | 'ORDER_SUBMITTED'
  | 'EXPIRED'
  | 'ORDER_VALIDATING'
  | 'MANUAL_REVIEW'
  | 'VALIDATION_APPROVED'
  | 'VALIDATION_REJECTED'
  | 'SELLER_CONFIRMED'
  | 'PREPARING'
  | 'AWAITING_COURIER_ASSIGNMENT'
  | 'COURIER_ASSIGNED'
  | 'READY_TO_SHIP'
  | 'READY_FOR_PICKUP'
  | 'SHIPMENT_HOLD'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'ON_HOLD'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERY_RESCHEDULED'
  | 'LOST_IN_TRANSIT'
  | 'AT_PICKUP_POINT'
  | 'CUSTOMER_ARRIVED_AT_PICKUP_POINT'
  | 'IDENTITY_VALIDATED'
  | 'PICKUP_AUTH_FAILED'
  | 'PICKUP_POINT_ISSUE'
  | 'PICKUP_EXPIRED'
  | 'PICKUP_CANCELLED_BY_CUSTOMER'
  | 'PICKED_UP'
  | 'PAYMENT_COLLECTION_PENDING'
  | 'PAYMENT_COLLECTED_ELECTRONIC'
  | 'PAYMENT_COLLECTED_CASH'
  | 'CASH_COLLECTION_PENDING'
  | 'CASH_PAYMENT_REJECTED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_SELLER'
  | 'CANCELLED_BY_SYSTEM'
  | 'CANCELLED_BY_ADMIN'
  | 'CANCELLED_NO_PAYMENT'
  | 'CUSTOMER_CANCEL_REQUEST'
  | 'CANCEL_REQUEST_APPROVED'
  | 'CANCEL_REQUEST_REJECTED'
  | 'RETURN_TO_ORIGIN'
  | 'RETURN_TO_ORIGIN_RECEIVED'
  | 'LOST_IN_RETURN'
  | 'DELIVERED'
  | 'DELIVERY_DISPUTED'
  | 'CONFIRMED_BY_CUSTOMER'
  | 'CONFIRMED_BY_SYSTEM'
  | 'COMPLETED_SUCCESSFULLY'
  | 'CLOSED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_IN_TRANSIT'
  | 'RETURN_RECEIVED'
  | 'RETURN_REJECTED'
  | 'RETURN_CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export type PaymentStatus =
  | 'PAYMENT_NOT_STARTED'
  | 'PENDING_ONLINE_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'PAID'
  | 'PAYMENT_FAILED_RETRYABLE'
  | 'PAYMENT_REJECTED_FINAL'
  | 'PENDING_COLLECTION'
  | 'COLLECTION_PROCESSING'
  | 'PAYMENT_COLLECTED'
  | 'PAYMENT_COLLECTION_FAILED'
  | 'PAYMENT_NOT_COLLECTED'

export type DeliveryType = 'SHIP' | 'PICKUP'
export type OrderOrigin = 'UI' | 'API'
export type BuyerType = 'INDIVIDUAL' | 'CORPORATE'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface OrderSummary {
  id: number
  order_status: OrderStatus
  payment_status: PaymentStatus
  delivery_type: DeliveryType
  buyer_name: string
  item_count: number
  total: number
  courier_name: string | null
  created_at: string
  order_origin: OrderOrigin | null
  buyer_type: BuyerType | null
}

export interface OrderListResponse {
  items: OrderSummary[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface OrderListFilters {
  status?: OrderStatus
  payment_status?: PaymentStatus
  courier_id?: number
  date_from?: string
  date_to?: string
  q?: string
  page?: number
  page_size?: number
  order_origin?: OrderOrigin
}

export interface OrderItem {
  id: number
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface OrderStateHistoryEntry {
  id: number
  dimension: string
  from_state: string
  to_state: string
  reason: string | null
  actor_role: string | null
  created_at: string
}

export interface PaymentDetail {
  id: number
  status: PaymentStatus
  method: string
  amount: number
  confirmed_at: string | null
  evidence_url: string | null
}

export type RefundOrderStatus =
  | 'REFUND_NOT_REQUIRED'
  | 'REFUND_PENDING'
  | 'REFUND_PROCESSING'
  | 'REFUND_PROVIDER_REQUESTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUND_FAILED'

export interface OrderDetail {
  id: number
  order_status: OrderStatus
  payment_status: PaymentStatus
  refund_status: RefundOrderStatus
  refund_modality: string | null
  delivery_type: DeliveryType
  order_origin: OrderOrigin | null
  buyer_type: BuyerType | null
  subtotal: number
  shipping_fee: number | null
  total: number
  notes: string | null
  delivery_address: string | null
  pickup_point_name: string | null
  buyer: {
    id: number
    name: string
    email: string
    phone: string | null
  }
  courier: {
    id: number
    name: string
    phone: string | null
  } | null
  items: OrderItem[]
  history: OrderStateHistoryEntry[]
  payment: PaymentDetail | null
  created_at: string
  updated_at: string
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildQuery(filters: OrderListFilters): string {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.payment_status) params.set('payment_status', filters.payment_status)
  if (filters.courier_id) params.set('courier_id', String(filters.courier_id))
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  if (filters.order_origin) params.set('order_origin', filters.order_origin)

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

export function listOrders(filters: OrderListFilters = {}): Promise<OrderListResponse> {
  return request<OrderListResponse>(`/admin/orders${buildQuery(filters)}`)
}

export function getOrder(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}`)
}

export function acceptOrder(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/accept`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function rejectOrder(orderId: number, reason?: string): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/reject`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reason }),
  })
}

export function markPreparing(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/mark-preparing`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function markReady(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/mark-ready`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function cancelOrder(orderId: number, reason?: string): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reason }),
  })
}

export function approveCancelRequest(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/cancel-request/approve`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function rejectCancelRequest(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/cancel-request/reject`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
