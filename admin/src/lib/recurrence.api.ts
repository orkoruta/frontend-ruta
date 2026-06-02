const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type RecurrenceStatus =
  | 'RECURRENCE_ACTIVE'
  | 'RECURRENCE_PAUSED'
  | 'RECURRENCE_CANCELLED'

export type RecurrencePeriodicity =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'CUSTOM'

export interface RecurrenceTemplate {
  id: number
  buyer_id: number
  buyer_name: string | null
  buyer_email: string | null
  periodicity: RecurrencePeriodicity
  next_generation_at: string | null
  last_generated_at: string | null
  status: RecurrenceStatus
  created_at: string
  updated_at: string
}

export interface RecurrenceListFilters {
  status?: RecurrenceStatus
  page?: number
  page_size?: number
}

export interface RecurrenceListResponse {
  data: RecurrenceTemplate[]
  pagination: { page: number; page_size: number; total: number }
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
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function buildQuery(filters: RecurrenceListFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.page_size) params.set('page_size', String(filters.page_size))
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function listRecurrenceTemplates(
  query: RecurrenceListFilters = {},
): Promise<RecurrenceListResponse> {
  return request<RecurrenceListResponse>(`/admin/recurrence${buildQuery(query)}`)
}

export function getRecurrenceTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/admin/recurrence/${id}`)
}

export function pauseTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/admin/recurrence/${id}/pause`, {
    method: 'POST',
  })
}

export function resumeTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/admin/recurrence/${id}/resume`, {
    method: 'POST',
  })
}

export function cancelTemplate(id: number): Promise<RecurrenceTemplate> {
  return request<RecurrenceTemplate>(`/admin/recurrence/${id}/cancel`, {
    method: 'POST',
  })
}
