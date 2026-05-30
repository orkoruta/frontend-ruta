const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface EnterControlViewResponse {
  access_token: string
  refresh_token: string
  target_client: {
    id: number
    name: string
    slug: string
  }
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

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError
    return body.message ?? 'Error inesperado.'
  } catch {
    return 'No pudimos completar la solicitud.'
  }
}

export async function enterControlView(
  targetClientId: number,
  masterPassword: string,
  reason?: string,
): Promise<EnterControlViewResponse> {
  const res = await fetch(`${API_BASE}/ruta-admin/control-view/enter`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey(),
    },
    body: JSON.stringify({
      target_client_id: targetClientId,
      master_password: masterPassword,
      reason: reason ?? undefined,
    }),
  })

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  return (await res.json()) as EnterControlViewResponse
}

export async function exitControlView(): Promise<void> {
  const res = await fetch(`${API_BASE}/ruta-admin/control-view/exit`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Idempotency-Key': idempotencyKey(),
    },
  })

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }
}
