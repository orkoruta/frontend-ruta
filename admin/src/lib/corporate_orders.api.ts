const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type DeliveryType = 'SHIP' | 'PICKUP'
export type PaymentMethod = 'ONLINE_AT_ORDER' | 'ELECTRONIC_ON_DELIVERY' | 'CASH_ON_DELIVERY'
export type PaymentSubmethod = 'DATAFONO' | 'BANK_TRANSFER' | 'PAYMENT_LINK' | 'QR'
export type RecurrencePeriodicity = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM_INTERVAL'

export interface CorporateContact {
  name: string
  email?: string
  phone?: string
}

export interface CorporateOrderItem {
  product_id: number
  quantity: number
}

/** Destino en SHIP. Las coordenadas son obligatorias: el mapa de asignación
 *  filtra por lat/lng no nulas. */
export interface CorporateDeliveryAddressInput {
  line: string
  city: string
  state: string
  country: string
  postal_code?: string
  latitude: number
  longitude: number
  instructions?: string
}

export interface CreateCorporateOrderInput {
  buyer_id: number
  corporate_contact: CorporateContact
  items: CorporateOrderItem[]
  delivery_type: DeliveryType
  /** Requerido cuando delivery_type es SHIP. */
  delivery_address?: CorporateDeliveryAddressInput
  /** Requerido cuando delivery_type es PICKUP. */
  pickup_point_id?: number
  payment_method: PaymentMethod
  payment_method_submethod?: PaymentSubmethod
  notes?: string
}

export interface CreateCorporateOrderRecurringInput extends CreateCorporateOrderInput {
  recurrence_periodicity: RecurrencePeriodicity
  custom_interval_days?: number
}

export interface RepeatLastInput {
  buyer_id: number
}

export interface CorporateOrder {
  id: number
  client_id: number
  buyer_id: number
  order_status: string
  order_origin: string
  buyer_type: string
  payment_method: PaymentMethod
  payment_method_submethod: PaymentSubmethod | null
  delivery_type: DeliveryType
  delivery_carrier_type: string | null
  subtotal: number
  total: number
  currency: string
  metadata: Record<string, unknown> | null
  items: {
    id: number
    product_id: number | null
    product_name: string
    sku: string | null
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  created_at: string
  updated_at: string
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
    return { code: 'REQUEST_FAILED', message: 'No pudimos completar la solicitud.' }
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
  return (await res.json()) as T
}

function idempotencyKey(): string {
  return `corp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createCorporateOrder(input: CreateCorporateOrderInput): Promise<CorporateOrder> {
  return request<CorporateOrder>('/admin/orders/corporate', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function createCorporateOrderRecurring(
  input: CreateCorporateOrderRecurringInput,
): Promise<{ order: CorporateOrder; recurrence_template: unknown }> {
  return request<{ order: CorporateOrder; recurrence_template: unknown }>(
    '/admin/orders/corporate/recurring',
    {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'X-Idempotency-Key': idempotencyKey() },
    },
  )
}

export function repeatLastCorporateOrder(
  input: RepeatLastInput,
): Promise<CorporateOrder> {
  return request<CorporateOrder>('/admin/orders/corporate/repeat-last', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
