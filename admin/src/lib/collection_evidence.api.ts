/**
 * Evidencia del cobro contra entrega.
 *
 * Mismo recurso desde dos ámbitos: el repartidor solo puede pedir la de sus
 * pedidos asignados, el staff del Cliente la de cualquiera de sus pedidos. La
 * comprobación la hace el backend; aquí solo se elige la ruta.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface CollectionEvidence {
  payment_id: number
  order_id: number
  /** Data URI (`data:image/…;base64,…`) o URL http(s), según cómo se guardó. */
  evidence_url: string
  notes: string | null
  amount: number
  currency: string
  payment_method: string
  payment_method_submethod: string | null
  collected_at: string | null
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export async function getCollectionEvidence(
  scope: 'courier' | 'admin',
  orderId: number,
): Promise<CollectionEvidence> {
  const path =
    scope === 'courier'
      ? `/courier/orders/${orderId}/collection-evidence`
      : `/admin/orders/${orderId}/collection-evidence`

  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' })

  if (!res.ok) {
    try {
      throw (await res.json()) as ApiError
    } catch (err) {
      // Si el cuerpo no es JSON, el `throw` de arriba no sirve como error de API.
      if (err && typeof err === 'object' && 'code' in err) throw err
      throw {
        code: 'REQUEST_FAILED',
        message: 'No pudimos cargar la foto del recibo.',
      } satisfies ApiError
    }
  }

  return (await res.json()) as CollectionEvidence
}
