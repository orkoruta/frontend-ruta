import { notifyUnauthorized } from './session-events'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Aviso por correo al comprador cuando se entrega su pedido.
 * Se guarda por Cliente en `client_parameters`.
 */
export interface DeliveryEmailConfig {
  enabled: boolean
  /**
   * A dónde llegan las respuestas del comprador. El correo **sale** desde la
   * dirección de RUTA (único dominio verificado) con el nombre del negocio.
   */
  reply_to: string
  from_name: string
  subject: string
  body: string
  /** Marcas admitidas en asunto y mensaje, p. ej. `comprador`, `pedido`. */
  placeholders: string[]
}

export interface DeliveryEmailConfigInput {
  enabled: boolean
  reply_to: string
  from_name: string
  subject: string
  body: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    return (await res.json()) as ApiError
  } catch {
    return { code: 'REQUEST_FAILED', message: 'No pudimos completar la solicitud.' }
  }
}

export async function getDeliveryEmailConfig(): Promise<DeliveryEmailConfig> {
  const res = await fetch(`${API_BASE}/admin/notifications/delivery-email`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (res.status === 401) notifyUnauthorized()
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as DeliveryEmailConfig
}

export async function saveDeliveryEmailConfig(
  input: DeliveryEmailConfigInput,
): Promise<DeliveryEmailConfig> {
  const res = await fetch(`${API_BASE}/admin/notifications/delivery-email`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey(),
    },
    body: JSON.stringify(input),
  })
  if (res.status === 401) notifyUnauthorized()
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as DeliveryEmailConfig
}
