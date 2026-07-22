/**
 * Etiquetas de estado para la vista del repartidor.
 *
 * El historial de un pedido incluye estados administrativos anteriores a que el
 * repartidor entrara en juego (validación, aceptación del negocio, preparación).
 * Mostrarlos en crudo —`VALIDATION_APPROVED`— no le dice nada, así que aquí se
 * traducen desde SU punto de vista: qué pasó con el pedido que va a entregar.
 *
 * Distinto del diccionario del admin (`OrderDetailClient`), que usa lenguaje de
 * operación interna. Mismo estado, audiencia distinta:
 *   SELLER_CONFIRMED → admin: "Aceptado por vendedor" · repartidor: "El negocio aceptó el pedido"
 */

export type StatusTone = 'blue' | 'amber' | 'green' | 'slate' | 'red'

interface StatusPresentation {
  label: string
  tone: StatusTone
}

const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  // ── Antes de llegar al repartidor ────────────────────────────────────────
  DRAFT: { label: 'Pedido creado', tone: 'slate' },
  PENDING_CONFIRM: { label: 'Pendiente de confirmar', tone: 'slate' },
  ORDER_SUBMITTED: { label: 'El comprador hizo el pedido', tone: 'slate' },
  ORDER_VALIDATING: { label: 'Revisando el pedido', tone: 'slate' },
  VALIDATION_APPROVED: { label: 'Pedido verificado', tone: 'slate' },
  MANUAL_REVIEW: { label: 'En revisión del negocio', tone: 'amber' },
  SELLER_CONFIRMED: { label: 'El negocio aceptó el pedido', tone: 'slate' },
  PREPARING: { label: 'El negocio lo está preparando', tone: 'blue' },
  AWAITING_COURIER_ASSIGNMENT: { label: 'Buscando repartidor', tone: 'amber' },
  READY_TO_SHIP: { label: 'Listo para recoger en el negocio', tone: 'blue' },
  SHIPMENT_HOLD: { label: 'Despacho detenido', tone: 'amber' },

  // ── Ya es tuyo ───────────────────────────────────────────────────────────
  COURIER_ASSIGNED: { label: 'Te asignaron el pedido', tone: 'blue' },
  SHIPPED: { label: 'Recogido en el negocio', tone: 'blue' },
  IN_TRANSIT: { label: 'En camino', tone: 'blue' },
  OUT_FOR_DELIVERY: { label: 'En reparto final', tone: 'blue' },
  ARRIVED_AT_CUSTOMER: { label: 'Llegaste al comprador', tone: 'blue' },
  ON_HOLD: { label: 'Entrega en pausa', tone: 'amber' },
  DELIVERY_ATTEMPTED: { label: 'Intento de entrega fallido', tone: 'amber' },
  DELIVERY_RESCHEDULED: { label: 'Entrega reprogramada', tone: 'amber' },

  // ── Cobro contra entrega ─────────────────────────────────────────────────
  PAYMENT_COLLECTION_PENDING: { label: 'Falta cobrar', tone: 'amber' },
  CASH_COLLECTION_PENDING: { label: 'Falta cobrar en efectivo', tone: 'amber' },
  PAYMENT_COLLECTED_CASH: { label: 'Cobraste en efectivo', tone: 'green' },
  PAYMENT_COLLECTED_ELECTRONIC: { label: 'Cobraste por medio electrónico', tone: 'green' },

  // ── Cierre ───────────────────────────────────────────────────────────────
  DELIVERED: { label: 'Entregado', tone: 'green' },
  CONFIRMED_BY_CUSTOMER: { label: 'El comprador confirmó la entrega', tone: 'green' },
  CONFIRMED_BY_SYSTEM: { label: 'Entrega confirmada automáticamente', tone: 'green' },
  COMPLETED_SUCCESSFULLY: { label: 'Pedido completado', tone: 'green' },

  // ── Devoluciones y cancelaciones ─────────────────────────────────────────
  RETURN_TO_ORIGIN: { label: 'Devolviendo al negocio', tone: 'amber' },
  RETURN_TO_ORIGIN_RECEIVED: { label: 'Devuelto al negocio', tone: 'slate' },
  LOST_IN_TRANSIT: { label: 'Pedido perdido en tránsito', tone: 'red' },
  CANCELLED_BY_CUSTOMER: { label: 'Cancelado por el comprador', tone: 'red' },
  CANCELLED_BY_SELLER: { label: 'Cancelado por el negocio', tone: 'red' },
  CANCELLED_BY_ADMIN: { label: 'Cancelado por el negocio', tone: 'red' },
  CANCELLED_BY_SYSTEM: { label: 'Cancelado automáticamente', tone: 'red' },
  CLOSED: { label: 'Pedido cerrado', tone: 'slate' },
  EXPIRED: { label: 'Pedido vencido', tone: 'slate' },
}

/**
 * Devuelve el estado en lenguaje del repartidor. Si aparece uno sin traducir
 * —por un estado nuevo del backend— se muestra el código tal cual antes que
 * ocultar información.
 */
export function courierStatusLabel(status: string): string {
  return STATUS_PRESENTATION[status]?.label ?? status
}

export function courierStatusTone(status: string): StatusTone {
  return STATUS_PRESENTATION[status]?.tone ?? 'slate'
}
