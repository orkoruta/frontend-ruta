const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type RecurrencePeriodicity = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM_INTERVAL'

export type RecurrenceStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

export interface RecurrenceTemplate {
  id: number
  order_id: number
  periodicity: RecurrencePeriodicity
  custom_interval_days: number | null
  status: RecurrenceStatus
  next_generation_at: string | null
  last_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface RecurrenceTemplateList {
  data: RecurrenceTemplate[]
}

export interface MarkRecurringInput {
  recurrence_periodicity: RecurrencePeriodicity
  custom_interval_days?: number
}

export interface RepeatLastOrderResponse {
  order_id: number
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function parseError(res: Response): Promise<{ code: string; message: string }> {
  try {
    return (await res.json()) as { code: string; message: string }
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
    cache: 'no-store',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function listMyTemplates(): Promise<RecurrenceTemplateList> {
  return request<RecurrenceTemplateList>('/buyer/recurrence')
}

export function getTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/buyer/recurrence/${id}`)
}

export function pauseTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/buyer/recurrence/${id}/pause`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function resumeTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/buyer/recurrence/${id}/resume`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function cancelTemplate(id: number): Promise<void> {
  return request<void>(`/buyer/recurrence/${id}`, {
    method: 'DELETE',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}

export function markOrderAsRecurring(
  orderId: number,
  input: MarkRecurringInput,
): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/buyer/orders/${orderId}/mark-recurring`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(input),
  })
}

export function repeatLastOrder(): Promise<RepeatLastOrderResponse> {
  return request<RepeatLastOrderResponse>('/buyer/recurrence/repeat-last', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
