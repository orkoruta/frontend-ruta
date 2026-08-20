import type {
  BuyerStatus,
  PickupPointListQuery,
  CreatePickupPointInput,
  UpdatePickupPointInput,
  BuyerListQuery,
  CourierListQuery,
  CreateCourierInput,
  UpdateCourierInput,
  UpdateBuyerInput,
} from '@orkoruta/shared'
import { notifyUnauthorized } from './session-events'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface ListResponse<T> {
  data: T[]
  pagination?: Pagination
}

export interface Buyer {
  id: number
  email: string
  full_name: string
  phone?: string | null
  document_type?: string | null
  document_number?: string | null
  status?: string | null
  created_at?: string | null
  addresses?: BuyerAddress[]
  orders?: OrderSummary[]
}

export interface BuyerAddress {
  id?: number
  line?: string
  city?: string
  state?: string
  instructions?: string | null
}

export interface Courier {
  id: number
  email?: string | null
  full_name: string
  phone?: string | null
  document_type?: string | null
  document_number?: string | null
  /** El backend anida el vehículo en `profile`, no lo devuelve plano. */
  profile?: { transport_mode?: string | null; vehicle_plate?: string | null } | null
  status?: string | null
  created_at?: string | null
  metrics?: CourierMetrics
  orders?: OrderSummary[]
}

export interface CourierMetrics {
  completed_deliveries?: number
  success_rate?: number
  average_delivery_minutes?: number
  active_orders?: number
}

/**
 * Lo que devuelve de verdad `serializePickupPoint` en el backend.
 *
 * Esta interfaz decía `address`, `phone` y `schedule`; la API emite
 * `address_line`, `contact_phone` y `opening_hours`. Las pantallas leían
 * campos que nunca llegaban, así que la dirección y el teléfono salían en
 * blanco, y el formulario los mandaba con el nombre viejo, que Zod descartaba
 * sin avisar. El único punto que existe en la BD lo creó el script de seed.
 */
export interface PickupPoint {
  id: number
  name: string
  address_line: string
  city?: string | null
  state?: string | null
  country?: string | null
  postal_code?: string | null
  contact_phone?: string | null
  /** Objeto JSON (`{"lunes-domingo": "12:00-22:00"}`), no una cadena. */
  opening_hours?: unknown
  latitude?: number | null
  longitude?: number | null
  status?: string | null
}

export interface OrderSummary {
  id: number
  order_status?: string | null
  total?: number | null
  created_at?: string | null
}

/**
 * Estados de comprador, en tiempo de ejecución.
 *
 * El tipo se importa de `@orkoruta/shared`, pero un tipo no existe al ejecutar
 * y hace falta estrechar lo que llega de la API y de un `<select>`. La lista se
 * escribe aquí en vez de importar el enum Zod **a propósito**: importar un
 * valor de `shared` arrastraría Zod entero al bundle del navegador, y esto es
 * una lista de tres cadenas.
 *
 * El riesgo de duplicarla está cubierto: `satisfies` obliga a que cada elemento
 * sea válido, y `_ExhaustiveCheck` **rompe la compilación** si el contrato del
 * backend añade un estado que aquí falte. Duplicado sí, desincronizado no.
 */
export const BUYER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const satisfies readonly BuyerStatus[]

/** Alias para el lado de repartidores: hoy comparten los mismos estados. */
export const toCourierStatus = (value: string | null | undefined): BuyerStatus =>
  toBuyerStatus(value)

type _ExhaustiveCheck = Exclude<BuyerStatus, (typeof BUYER_STATUSES)[number]> extends never
  ? true
  : ['Falta un estado en BUYER_STATUSES', Exclude<BuyerStatus, (typeof BUYER_STATUSES)[number]>]

/**
 * Estrecha lo que llega de fuera. Si no reconoce el valor, cae en ACTIVE.
 *
 * Sirve igual para repartidores: `courierListQuerySchema` y `updateCourierSchema`
 * usan el mismo trío de estados. Si algún día divergen, el
 * `_ExhaustiveCheck` de arriba avisará en compilación.
 */
export function toBuyerStatus(value: string | null | undefined): BuyerStatus {
  return (BUYER_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as BuyerStatus)
    : 'ACTIVE'
}

type QueryValue = string | number | boolean | null | undefined
type RequestBody = Record<string, unknown>

/**
 * Los filtros y cuerpos de estas llamadas se tipan con los **esquemas Zod del
 * backend**, importados de `@orkoruta/shared`. No es decoración: es lo que
 * impide que se repita el bug más caro del proyecto.
 *
 * Antes eran `Record<string, QueryValue>`, que acepta cualquier clave. El
 * frontend mandaba `search`/`limit` donde el backend espera `q`/`page_size`;
 * Zod ignora en silencio lo que no conoce, así que el filtro no filtraba nada y
 * **no fallaba nada**: ni el typecheck, ni los tests, ni la consola. Diez bugs
 * de la misma familia salieron de ahí (`vehicle_type` vs `transport_mode`,
 * `parameter_value` vs `value`, `periodicity` vs `recurrence_periodicity`…).
 *
 * Con estos tipos, un nombre de campo equivocado es un **error de compilación**.
 *
 * Regla para lo nuevo: si el endpoint tiene esquema en `@orkoruta/shared`,
 * úsalo. Si no lo tiene, muévelo allí antes de consumirlo a mano.
 */

function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
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

async function apiFetch<T>(
  path: string,
  options: RequestInit & { bodyJson?: RequestBody } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.bodyJson) {
    headers.set('Content-Type', 'application/json')
  }
  if (
    options.method &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())
  ) {
    headers.set('X-Idempotency-Key', idempotencyKey())
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.bodyJson ? JSON.stringify(options.bodyJson) : options.body,
  })

  if (res.status === 401) notifyUnauthorized()
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function listPath(path: string, params: Record<string, QueryValue>) {
  return `${path}${toQuery(params)}`
}

export function listBuyers(params: Partial<BuyerListQuery> = {}) {
  return apiFetch<ListResponse<Buyer>>(listPath('/admin/buyers', params))
}

export function getBuyer(id: string) {
  return apiFetch<Buyer>(`/admin/buyers/${id}`)
}

export function updateBuyer(id: string, body: UpdateBuyerInput) {
  return apiFetch<Buyer>(`/admin/buyers/${id}`, { method: 'PATCH', bodyJson: body })
}

export function listCouriers(params: Partial<CourierListQuery> = {}) {
  return apiFetch<ListResponse<Courier>>(listPath('/admin/couriers', params))
}

export function getCourier(id: string) {
  return apiFetch<Courier>(`/admin/couriers/${id}`)
}

export function createCourier(body: CreateCourierInput) {
  return apiFetch<Courier>('/admin/couriers', { method: 'POST', bodyJson: body })
}

export function updateCourier(id: string, body: UpdateCourierInput) {
  return apiFetch<Courier>(`/admin/couriers/${id}`, { method: 'PATCH', bodyJson: body })
}

export function listPickupPoints(params: Partial<PickupPointListQuery> = {}) {
  return apiFetch<ListResponse<PickupPoint>>(listPath('/admin/pickup-points', params))
}

export function getPickupPoint(id: string) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}`)
}

export function createPickupPoint(body: CreatePickupPointInput) {
  return apiFetch<PickupPoint>('/admin/pickup-points', { method: 'POST', bodyJson: body })
}

export function updatePickupPoint(id: string, body: UpdatePickupPointInput) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}`, {
    method: 'PATCH',
    bodyJson: body,
  })
}

/**
 * El estado no se cambia con el PATCH: `createPickupPointSchema` no incluye
 * `status` y el service lo fija a ACTIVE al crear. Hay endpoints propios.
 *
 * Aquí había un `deletePickupPoint` que llamaba a `DELETE
 * /admin/pickup-points/:id`, **una ruta que no existe** — el botón "Eliminar"
 * devolvía 404. Y borrar de verdad tampoco procede: los pedidos en PICKUP
 * apuntan al punto, así que darlo de baja es desactivarlo.
 */
export function activatePickupPoint(id: string) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}/activate`, { method: 'POST' })
}

export function deactivatePickupPoint(id: string) {
  return apiFetch<PickupPoint>(`/admin/pickup-points/${id}/deactivate`, { method: 'POST' })
}
