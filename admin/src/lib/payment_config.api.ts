const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Estado de la config Wompi. Los secretos nunca vuelven del backend: solo se
 * sabe si están cargados (`has_private_key`, `has_webhook_secret`).
 */
export interface WompiConfig {
  configured: boolean
  enabled: boolean
  public_key: string
  has_private_key: boolean
  has_webhook_secret: boolean
  updated_at: string | null
}

export interface WompiConfigInput {
  enabled: boolean
  public_key: string
  /** Opcional al actualizar: vacío = conservar el secreto ya guardado. */
  private_key?: string
  events_secret?: string
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

export async function getWompiConfig(): Promise<WompiConfig> {
  const res = await fetch(`${API_BASE}/admin/payment-providers/wompi`, {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as WompiConfig
}

export async function saveWompiConfig(input: WompiConfigInput): Promise<WompiConfig> {
  const res = await fetch(`${API_BASE}/admin/payment-providers/wompi`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey(),
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as WompiConfig
}
