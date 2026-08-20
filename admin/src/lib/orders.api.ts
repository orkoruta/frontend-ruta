import { notifyUnauthorized } from './session-events'

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

/**
 * De dónde salió el pedido. Son los valores del CHECK de `orders.order_origin`.
 *
 * Aquí decía `'UI' | 'API'`, que **no son valores que la API emita ni acepte**.
 * No se notaba porque el backend descartaba el filtro en silencio y la insignia
 * de la tabla comparaba con `'API'`, que nunca coincidía. Al empezar a validarse
 * el filtro, mandar `'UI'` sería un 400.
 */
export type OrderOrigin =
  | 'BUYER_UI'
  | 'CORPORATE_MANUAL'
  | 'RECURRENCE'
  | 'FULL_LANDING_API'
  | 'API_LOGISTICS'

/** Etiquetas para el panel. El código va en inglés; la UI, en español. */
export const ORDER_ORIGIN_LABELS: Record<OrderOrigin, string> = {
  BUYER_UI: 'Tienda',
  CORPORATE_MANUAL: 'Corporativo',
  RECURRENCE: 'Recurrente',
  FULL_LANDING_API: 'Landing',
  API_LOGISTICS: 'API',
}

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
  /** Teléfono del comprador. Para un invitado es el único contacto real. */
  buyer_phone: string | null
  /** Pidió sin cuenta: su correo es sintético y no lleva a ninguna bandeja. */
  buyer_is_guest: boolean
  item_count: number
  total: number
  courier_name: string | null
  created_at: string
  order_origin: OrderOrigin | null
  buyer_type: BuyerType | null
}

export interface OrderListResponse {
  data: OrderSummary[]
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
  state_dimension: string
  previous_value: string | null
  new_value: string
  reason: string | null
  actor_type: string | null
  occurred_at: string
}

/**
 * Solo llega en el detalle del pedido; en el listado es `null`.
 *
 * No trae la evidencia de cobro: es un JSONB que hoy guarda la foto en base64,
 * y meterla aquí cargaría cientos de kB en cada lectura del pedido. La sirve
 * `GET /admin/orders/:id/collection-evidence`, que es lo que consume
 * `CollectionEvidenceCard`.
 */
export interface PaymentDetail {
  id: number
  status: PaymentStatus
  method: string
  amount: number
  /** Confirmación de la pasarela o, en contra entrega, el momento del cobro. */
  confirmed_at: string | null
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
  /** Día de entrega fijado por el Cliente (`YYYY-MM-DD`). `null` si no lo ha fijado. */
  scheduled_delivery_date: string | null
  /**
   * Método pactado al crear el pedido. Siempre presente, a diferencia de
   * `payment`, que no existe hasta que hay un cobro registrado.
   */
  payment_method: 'ONLINE_AT_ORDER' | 'ELECTRONIC_ON_DELIVERY' | 'CASH_ON_DELIVERY'
  /** `PAYMENT_LINK` = pagó (o debe pagar) por link de Nequi: se confirma a mano. */
  payment_method_submethod: string | null
  buyer: {
    id: number
    name: string
    /** Sintético (`guest-<uuid>@guest.ruta`) cuando `is_guest` es `true`. */
    email: string
    phone: string | null
    is_guest: boolean
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

  if (res.status === 401) notifyUnauthorized()
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

/** Envía un pedido corporativo en DRAFT que el Cliente registró (Flujo 6). */
export function confirmCorporateOrder(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/confirm`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
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

export type DeliveryCarrierType = 'OWN_FLEET' | 'EXTERNAL_COURIER'

/**
 * Marca el pedido como listo. En SHIP, el transportador decide la rama:
 * OWN_FLEET va a asignación de repartidor (mapa) y el resto a despacho directo.
 */
export function markReady(
  orderId: number,
  deliveryCarrierType?: DeliveryCarrierType,
): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/mark-ready`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    ...(deliveryCarrierType
      ? { body: JSON.stringify({ delivery_carrier_type: deliveryCarrierType }) }
      : {}),
  })
}

/**
 * Fija el día de entrega del pedido. `null` limpia la programación, para poder
 * deshacer una fecha puesta por error.
 */
export function setDeliveryDate(
  orderId: number,
  scheduledDeliveryDate: string | null,
): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/delivery-date`, {
    method: 'PUT',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ scheduled_delivery_date: scheduledDeliveryDate }),
  })
}

/**
 * Marca como recibido un pago hecho por link de Nequi. Ese medio no tiene
 * webhook, así que la confirmación la da el Cliente tras verlo en su app.
 */
export function confirmLinkPayment(orderId: number): Promise<OrderDetail> {
  return request<OrderDetail>(`/admin/orders/${orderId}/confirm-payment`, {
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
