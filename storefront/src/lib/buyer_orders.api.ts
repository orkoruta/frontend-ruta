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

export type RefundStatus =
  | 'REFUND_NOT_REQUIRED'
  | 'REFUND_PENDING'
  | 'REFUND_PROCESSING'
  | 'REFUND_PROVIDER_REQUESTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUND_FAILED'

export type RefundModality = 'STORE_CREDIT' | 'BANK_REFUND'

export interface BuyerRefundDetail {
  id: number
  amount: number
  currency: string
  status: string
  reason: string | null
  created_at: string
  updated_at: string
}

export interface BuyerOrderRefundResponse {
  refund_status: RefundStatus
  refund_modality: RefundModality | null
  refund: BuyerRefundDetail | null
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface BuyerOrderItem {
  id: number
  product_id: number | null
  product_name: string
  sku: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface BuyerDeliveryAddress {
  line: string
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  instructions: string | null
}

export interface BuyerOrderHistoryEntry {
  id?: number
  dimension?: string
  from_state?: string | null
  to_state?: string
  from_status?: string | null
  to_status?: string
  reason?: string | null
  actor_role?: string | null
  changed_by_user_type?: string | null
  created_at: string
}

export interface BuyerOrder {
  id: number
  client_id: number
  buyer_id: number
  courier_user_id: number | null
  order_status: OrderStatus
  payment_status: PaymentStatus
  refund_status: RefundStatus
  refund_modality: RefundModality | null
  return_status: string | null
  dispute_status: string | null
  delivery_type: DeliveryType
  delivery_carrier_type: string | null
  payment_method: string
  payment_method_submethod: string | null
  buyer_type: string
  closure_reason: string | null
  delivery_address: BuyerDeliveryAddress | null
  pickup_point_id: number | null
  subtotal: number
  tax: number
  shipping_fee: number
  discount: number
  total: number
  currency: string
  items: BuyerOrderItem[]
  history?: BuyerOrderHistoryEntry[]
  created_at: string
  updated_at: string
  submitted_at: string | null
  delivered_at: string | null
  closed_at: string | null
}

export interface BuyerOrdersResponse {
  data: BuyerOrder[]
  pagination: {
    page: number
    page_size: number
    total: number
  }
}

export interface BuyerOrderListParams {
  page?: number
  page_size?: number
  status?: OrderStatus
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildQuery(params: BuyerOrderListParams = {}): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.page_size) query.set('page_size', String(params.page_size))
  if (params.status) query.set('status', params.status)

  const value = query.toString()
  return value ? `?${value}` : ''
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
    cache: 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function listBuyerOrders(params: BuyerOrderListParams = {}): Promise<BuyerOrdersResponse> {
  return request<BuyerOrdersResponse>(`/buyer/orders${buildQuery(params)}`)
}

export function getBuyerOrder(orderId: number): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/buyer/orders/${orderId}`)
}

export function cancelBuyerOrder(orderId: number, reason: string): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/buyer/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reason }),
  })
}

export function requestBuyerOrderCancel(orderId: number, reason: string): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/buyer/orders/${orderId}/request-cancel`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ reason }),
  })
}

export function confirmBuyerOrderReceipt(orderId: number): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/buyer/orders/${orderId}/confirm-receipt`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function getBuyerOrderRefund(orderId: number): Promise<BuyerOrderRefundResponse> {
  return request<BuyerOrderRefundResponse>(`/buyer/orders/${orderId}/refund`)
}
