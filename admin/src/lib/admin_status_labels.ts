/**
 * Etiquetas de estado para las pantallas del staff del Cliente.
 *
 * Vive en un solo módulo a propósito: este diccionario estuvo copiado en la
 * lista de pedidos y en el detalle, y las copias se desincronizaron — el detalle
 * traducía estados que la lista mostraba en crudo (`PAYMENT_COLLECTED_CASH`).
 * Cualquier pantalla nueva del admin debe importar de aquí, no copiar.
 *
 * Distinto del diccionario del repartidor (`courier_status_labels.ts`): este usa
 * lenguaje de operación interna, aquel habla desde la entrega. Mismo estado,
 * audiencia distinta.
 */

import type { OrderStatus } from '@/lib/orders.api'

export type StatusColor = 'slate' | 'violet' | 'amber' | 'blue' | 'green' | 'red'

interface StatusPresentation {
  label: string
  color: StatusColor
}

/**
 * Los 61 estados de `OrderStatus`. Si el backend agrega uno, aparecerá su
 * código crudo en pantalla: preferible a ocultar información, pero es señal de
 * que hay que completarlo aquí.
 */
const STATUS_PRESENTATION: Record<OrderStatus, StatusPresentation> = {
  // ── Creación y validación ────────────────────────────────────────────────
  DRAFT: { label: 'Borrador', color: 'slate' },
  PENDING_CONFIRM: { label: 'Pendiente confirmación', color: 'slate' },
  ORDER_SUBMITTED: { label: 'Enviado', color: 'blue' },
  EXPIRED: { label: 'Expirado', color: 'slate' },
  ORDER_VALIDATING: { label: 'Validando', color: 'violet' },
  MANUAL_REVIEW: { label: 'Revisión manual', color: 'violet' },
  VALIDATION_APPROVED: { label: 'Validación aprobada', color: 'violet' },
  VALIDATION_REJECTED: { label: 'Validación rechazada', color: 'red' },
  SELLER_CONFIRMED: { label: 'Aceptado por vendedor', color: 'violet' },

  // ── Preparación y despacho ───────────────────────────────────────────────
  PREPARING: { label: 'Preparando', color: 'blue' },
  AWAITING_COURIER_ASSIGNMENT: { label: 'Sin repartidor', color: 'amber' },
  COURIER_ASSIGNED: { label: 'Repartidor asignado', color: 'blue' },
  READY_TO_SHIP: { label: 'Listo para despacho', color: 'blue' },
  READY_FOR_PICKUP: { label: 'Listo para recogida', color: 'blue' },
  SHIPMENT_HOLD: { label: 'Despacho retenido', color: 'amber' },
  SHIPPED: { label: 'Despachado', color: 'blue' },
  IN_TRANSIT: { label: 'En tránsito', color: 'blue' },
  ON_HOLD: { label: 'Tránsito retenido', color: 'amber' },
  OUT_FOR_DELIVERY: { label: 'En reparto final', color: 'blue' },
  ARRIVED_AT_CUSTOMER: { label: 'Llegó al comprador', color: 'blue' },
  DELIVERY_ATTEMPTED: { label: 'Intento fallido', color: 'amber' },
  DELIVERY_RESCHEDULED: { label: 'Entrega reprogramada', color: 'amber' },
  LOST_IN_TRANSIT: { label: 'Perdido en tránsito', color: 'red' },

  // ── Punto físico (PICKUP) ────────────────────────────────────────────────
  AT_PICKUP_POINT: { label: 'Disponible en punto físico', color: 'blue' },
  CUSTOMER_ARRIVED_AT_PICKUP_POINT: { label: 'Comprador en punto', color: 'blue' },
  IDENTITY_VALIDATED: { label: 'Identidad validada', color: 'blue' },
  PICKUP_AUTH_FAILED: { label: 'Autenticación fallida en punto', color: 'red' },
  PICKUP_POINT_ISSUE: { label: 'Incidencia en punto físico', color: 'amber' },
  PICKUP_EXPIRED: { label: 'Recogida vencida', color: 'slate' },
  PICKUP_CANCELLED_BY_CUSTOMER: { label: 'Recogida cancelada (comprador)', color: 'red' },
  PICKED_UP: { label: 'Recogido por el comprador', color: 'green' },

  // ── Cobro contra entrega ─────────────────────────────────────────────────
  PAYMENT_COLLECTION_PENDING: { label: 'Cobro pendiente', color: 'amber' },
  CASH_COLLECTION_PENDING: { label: 'Cobro en efectivo pendiente', color: 'amber' },
  PAYMENT_COLLECTED_CASH: { label: 'Cobrado en efectivo', color: 'green' },
  PAYMENT_COLLECTED_ELECTRONIC: { label: 'Cobrado electrónicamente', color: 'green' },
  CASH_PAYMENT_REJECTED: { label: 'Pago en efectivo rechazado', color: 'red' },

  // ── Entrega y cierre ─────────────────────────────────────────────────────
  DELIVERED: { label: 'Entregado', color: 'green' },
  DELIVERY_DISPUTED: { label: 'En disputa', color: 'red' },
  CONFIRMED_BY_CUSTOMER: { label: 'Confirmado por comprador', color: 'green' },
  CONFIRMED_BY_SYSTEM: { label: 'Confirmado por sistema', color: 'green' },
  COMPLETED_SUCCESSFULLY: { label: 'Completado', color: 'green' },
  CLOSED: { label: 'Cerrado', color: 'slate' },

  // ── Cancelaciones ────────────────────────────────────────────────────────
  CANCELLED_BY_CUSTOMER: { label: 'Cancelado (comprador)', color: 'red' },
  CANCELLED_BY_SELLER: { label: 'Cancelado (vendedor)', color: 'red' },
  CANCELLED_BY_SYSTEM: { label: 'Cancelado (sistema)', color: 'red' },
  CANCELLED_BY_ADMIN: { label: 'Cancelado (admin)', color: 'red' },
  CANCELLED_NO_PAYMENT: { label: 'Cancelado sin pago', color: 'red' },
  CUSTOMER_CANCEL_REQUEST: { label: 'Solicitud de cancelación', color: 'amber' },
  CANCEL_REQUEST_APPROVED: { label: 'Cancelación aprobada', color: 'red' },
  CANCEL_REQUEST_REJECTED: { label: 'Cancelación rechazada', color: 'slate' },

  // ── Retorno al origen ────────────────────────────────────────────────────
  RETURN_TO_ORIGIN: { label: 'Regresando a origen', color: 'amber' },
  RETURN_TO_ORIGIN_RECEIVED: { label: 'Devuelto a origen', color: 'green' },
  LOST_IN_RETURN: { label: 'Perdido en retorno', color: 'red' },

  // ── Devoluciones y reembolsos ────────────────────────────────────────────
  // En curso, no fallidas: antes caían en el rojo por defecto y parecían error.
  RETURN_REQUESTED: { label: 'Devolución solicitada', color: 'amber' },
  RETURN_APPROVED: { label: 'Devolución aprobada', color: 'amber' },
  RETURN_IN_TRANSIT: { label: 'Devolución en tránsito', color: 'amber' },
  RETURN_RECEIVED: { label: 'Devolución recibida', color: 'green' },
  RETURN_REJECTED: { label: 'Devolución rechazada', color: 'red' },
  RETURN_CANCELLED: { label: 'Devolución cancelada', color: 'slate' },
  REFUND_PENDING: { label: 'Reembolso pendiente', color: 'amber' },
  REFUNDED: { label: 'Reembolsado', color: 'green' },
}

export function adminStatusLabel(status: OrderStatus): string {
  return STATUS_PRESENTATION[status]?.label ?? status
}

export function adminStatusColor(status: OrderStatus): StatusColor {
  return STATUS_PRESENTATION[status]?.color ?? 'slate'
}

/** Clases del badge por color, compartidas por lista y detalle. */
export const STATUS_BADGE_CLASSES: Record<StatusColor, string> = {
  slate: 'bg-white/[0.06] text-slate-600 border-white/10 dark:text-slate-300',
  violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
  amber: 'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  blue: 'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  green: 'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  red: 'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}
