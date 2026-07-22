const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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
  | 'ELECTRONIC_ON_DELIVERY'
  | 'CASH_ON_DELIVERY'

/** Contra entrega: el cobro lo toma el repartidor, en efectivo o electrónico. */
export function isCollectOnDelivery(method: PaymentMethod): boolean {
  return method === 'CASH_ON_DELIVERY' || method === 'ELECTRONIC_ON_DELIVERY'
}

/** Destino tal como lo entrega el backend del repartidor. */
export interface CourierDeliveryAddress {
  line: string
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  /** Detalle dentro del predio: "Casa 19", "Torre B, piso 4". */
  instructions: string | null
}

/** Una línea legible con la dirección, sin las indicaciones internas. */
export function formatDeliveryAddress(address: CourierDeliveryAddress | null): string {
  if (!address) return 'Sin dirección registrada'
  return [address.line, address.city, address.state].filter(Boolean).join(', ')
}

export interface CourierOrder {
  id: number
  order_status: CourierOrderStatus
  delivery_address: CourierDeliveryAddress | null
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
  delivery_address: CourierDeliveryAddress | null
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
    state_dimension: string
    previous_value: string | null
    new_value: string
    actor_type: string | null
    reason: string | null
    occurred_at: string
  }>
  created_at: string
}

export interface AssignedOrdersResponse {
  active: CourierOrder[]
  completed_today: number
}

export type CollectionMethod = 'CASH' | 'ELECTRONIC'
export type ElectronicSubmethod = 'DATAFONO' | 'QR' | 'BANK_TRANSFER'

/**
 * Tope del data URI de la evidencia; debe coincidir con el del backend
 * (`MAX_EVIDENCE_DATA_URI_LENGTH` en `collection.service.ts`). Se valida también
 * aquí para no hacerle subir un megabyte al repartidor solo para recibir un 400.
 */
const MAX_EVIDENCE_DATA_URI_LENGTH = 1_400_000

/**
 * La foto viaja embebida en el JSON mientras el proyecto no tenga object
 * storage. Cuando exista un bucket, esto se reemplaza por subir el archivo y
 * mandar solo la URL.
 */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer la foto.'))
    reader.readAsDataURL(file)
  })
}

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

export async function recordCollection(
  id: number,
  payload: CollectionPayload,
  key = idempotencyKey(),
): Promise<CourierOrderDetail> {
  const evidenceUrl = await fileToDataUri(payload.evidence)

  if (evidenceUrl.length > MAX_EVIDENCE_DATA_URI_LENGTH) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'La foto es demasiado pesada. Vuelve a tomarla.',
    } satisfies ApiError
  }

  // A diferencia del resto de acciones del repartidor, este endpoint responde
  // con el resultado del cobro (`payment_id`, `amount`…), no con el pedido. Se
  // vuelve a pedir el detalle para devolver siempre lo mismo que las demás; si
  // se devolviera la respuesta cruda, la pantalla se quedaría sin `buyer` ni
  // `items` y reventaría al pintarlos.
  await request<unknown>(`/courier/orders/${id}/record-collection`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': key },
    body: JSON.stringify({
      amount: payload.amount,
      currency: payload.currency,
      method: payload.method,
      ...(payload.electronic_submethod
        ? { electronic_submethod: payload.electronic_submethod }
        : {}),
      ...(payload.external_txn_id ? { external_txn_id: payload.external_txn_id } : {}),
      ...(payload.notes ? { notes: payload.notes } : {}),
      evidence_url: evidenceUrl,
    }),
  })

  return getCourierOrderById(id)
}
