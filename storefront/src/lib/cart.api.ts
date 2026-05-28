const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1'

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  unit_price: number
  quantity: number
  subtotal: number
  image_url: string | null
  stock_quantity: number
}

export interface DraftOrder {
  id: number
  order_status: string
  subtotal: number
  total: number
  items: CartItem[]
}

type ApiErrorBody = {
  code: string
  message: string
  details?: unknown
}

export class CartApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'CartApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // empty body
    }
    throw new CartApiError(
      res.status,
      body?.code ?? 'UNKNOWN',
      body?.message ?? `Error ${res.status}`,
    )
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

type OrderListResponse = { data: DraftOrder[] } | DraftOrder[]

export async function getDraftOrder(): Promise<DraftOrder | null> {
  const res = await fetch(`${API_BASE}/buyer/orders`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.status === 401) {
    throw new CartApiError(401, 'AUTHENTICATION_REQUIRED', 'Autenticación requerida')
  }
  if (!res.ok) {
    let body: ApiErrorBody | undefined
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // empty body
    }
    throw new CartApiError(
      res.status,
      body?.code ?? 'UNKNOWN',
      body?.message ?? `Error ${res.status}`,
    )
  }
  const raw = (await res.json()) as OrderListResponse
  const list: DraftOrder[] = Array.isArray(raw) ? raw : raw.data
  return list.find((o) => o.order_status === 'DRAFT') ?? null
}

export async function addItemsToCart(
  items: Array<{ product_id: number; quantity: number }>,
): Promise<DraftOrder> {
  const res = await fetch(`${API_BASE}/buyer/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
    body: JSON.stringify({ items }),
  })
  return handleResponse<DraftOrder>(res)
}

export async function updateCartItem(
  orderId: number,
  itemId: number,
  quantity: number,
): Promise<void> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  })
  return handleResponse<void>(res)
}

export async function removeCartItem(orderId: number, itemId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
  })
  return handleResponse<void>(res)
}

export async function clearCart(orderId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/buyer/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      'X-Idempotency-Key': crypto.randomUUID(),
    },
    credentials: 'include',
  })
  return handleResponse<void>(res)
}
