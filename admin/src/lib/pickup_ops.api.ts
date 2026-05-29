const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function parseError(res: Response): Promise<Error> {
  try {
    const body = (await res.json()) as { message?: string }
    return new Error(body.message ?? 'No pudimos completar la solicitud.')
  } catch {
    return new Error('No pudimos completar la solicitud.')
  }
}

export async function verifyPickupIdentity(
  orderId: number,
  documentType: string,
  documentNumber: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/orders/${orderId}/verify-pickup-identity`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        document_type: documentType,
        document_number: documentNumber,
      }),
    },
  )

  if (!res.ok) throw await parseError(res)
}

export async function recordPickupCollection(
  orderId: number,
  amount: number,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/orders/${orderId}/pickup-collection`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ amount }),
    },
  )

  if (!res.ok) throw await parseError(res)
}

export async function markPickupDelivered(orderId: number): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/orders/${orderId}/mark-pickup-delivered`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
    },
  )

  if (!res.ok) throw await parseError(res)
}
