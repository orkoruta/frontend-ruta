const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1'

export type CourierOrderStatus =
  | 'COURIER_ASSIGNED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERED'
  | 'CONFIRMED_BY_CUSTOMER'
  | 'CONFIRMED_BY_SYSTEM'
  | 'COMPLETED_SUCCESSFULLY'

export type PaymentMethod =
  | 'ONLINE_AT_ORDER'
  | 'ON_DELIVERY'

export interface CourierOrder {
  id: number
  order_status: CourierOrderStatus
  delivery_address: string
  buyer_name: string
  buyer_phone: string | null
  total: number
  payment_method: PaymentMethod
  created_at: string
}

export interface CourierOrderItem {
  id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface CourierOrderDetail {
  id: number
  order_status: CourierOrderStatus
  delivery_address: string
  buyer: {
    name: string
    phone: string | null
  }
  items: CourierOrderItem[]
  total: number
  payment_method: PaymentMethod
  collection_recorded: boolean
  history: Array<{
    id: number
    to_state: string
    created_at: string
  }>
  created_at: string
}

export interface AssignedOrdersResponse {
  active: CourierOrder[]
  completed_today: number
}

export type CollectionMethod = 'CASH' | 'ELECTRONIC'
export type ElectronicSubmethod = 'DATAFONO' | 'QR' | 'BANK_TRANSFER'

export interface CollectionPayload {
  amount: number
  currency: 'COP'
  method: CollectionMethod
  electronic_submethod?: ElectronicSubmethod
  external_txn_id?: string
  notes?: string
  evidence: File
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
    return { code: 'REQUEST_FAILED', message: 'No pudimos completar la solicitud.' }
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { skipContentType?: boolean },
): Promise<T> {
  const { skipContentType, ...rest } = init ?? {}
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(!skipContentType && rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function getAssignedOrders(): Promise<AssignedOrdersResponse> {
  return request<AssignedOrdersResponse>('/courier/orders/assigned')
}

export function getCourierOrderById(id: number): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}`)
}

export function startShipping(id: number, key = idempotencyKey()): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}/start-shipping`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
  })
}

export function markOutForDelivery(id: number, key = idempotencyKey()): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}/mark-out-for-delivery`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
  })
}

export function arrive(id: number, key = idempotencyKey()): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}/arrive`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
  })
}

export function markDelivered(id: number, key = idempotencyKey()): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}/mark-delivered`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
  })
}

export function attemptFailed(
  id: number,
  reason: string,
  key = idempotencyKey(),
): Promise<CourierOrderDetail> {
  return request<CourierOrderDetail>(`/courier/orders/${id}/attempt-failed`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
    body: JSON.stringify({ reason }),
  })
}

export function recordCollection(
  id: number,
  payload: CollectionPayload,
  key = idempotencyKey(),
): Promise<CourierOrderDetail> {
  const form = new FormData()
  form.append('amount', String(payload.amount))
  form.append('currency', payload.currency)
  form.append('method', payload.method)
  if (payload.electronic_submethod) {
    form.append('electronic_submethod', payload.electronic_submethod)
  }
  if (payload.external_txn_id) {
    form.append('external_txn_id', payload.external_txn_id)
  }
  if (payload.notes) {
    form.append('notes', payload.notes)
  }
  form.append('evidence', payload.evidence)

  return request<CourierOrderDetail>(`/courier/orders/${id}/record-collection`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
    body: form,
    skipContentType: true,
  })
}
