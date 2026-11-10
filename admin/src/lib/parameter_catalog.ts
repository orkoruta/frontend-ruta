/**
 * Cómo se le muestra cada parámetro al Cliente en Ajustes → Parámetros.
 *
 * Las claves (`limits.max_concurrent_orders_per_courier`…) son internas: las
 * lee el backend y no se tocan. Antes la pantalla las enseñaba tal cual
 * («Max Concurrent Orders Per Courier») con descripciones técnicas («Tiempo en
 * DELIVERED antes de CONFIRMED_BY_SYSTEM»), y el Cliente no tenía forma de
 * saber qué estaba cambiando.
 *
 * `active` dice si el backend **lee de verdad** el parámetro. Verificado el
 * 2026-11-10 contra `backend-ruta/api/src`: solo los marcados `active: true`
 * tienen efecto. El resto se sembró en el diseño inicial y nunca se conectó; se
 * muestran aparte y avisando, para que nadie cambie uno creyendo que funciona.
 * Si se conecta uno nuevo en el backend, márcalo aquí como `active: true`.
 */

export type ParameterSection =
  | 'couriers'
  | 'orders'
  | 'closing'
  | 'pickup'
  | 'data'
  | 'inactive'
  | 'technical'

export interface ParameterInfo {
  /** Nombre que ve el Cliente. */
  label: string
  /** Qué hace, en lenguaje del negocio. */
  help: string
  /** Unidad del valor, para mostrarla junto al campo. */
  unit?: 'minutos' | 'horas' | 'días' | 'días hábiles' | 'pedidos' | 'veces' | 'filas' | 'imágenes' | 'COP'
  section: ParameterSection
  /** El backend lo usa hoy. */
  active?: boolean
}

export const SECTION_LABELS: Record<ParameterSection, { title: string; subtitle: string }> = {
  couriers: { title: 'Repartidores', subtitle: 'reparto y asignación' },
  orders: { title: 'Pedidos y pagos', subtitle: 'tiempos de espera' },
  closing: { title: 'Cierre de pedidos', subtitle: 'después de la entrega' },
  pickup: { title: 'Recogida en punto físico', subtitle: 'pedidos para recoger' },
  data: { title: 'Datos y archivos', subtitle: 'limpieza automática' },
  inactive: {
    title: 'Otros ajustes (todavía sin efecto)',
    subtitle: 'reservados para funciones futuras',
  },
  technical: {
    title: 'Ajustes técnicos de RUTA',
    subtitle: 'solo lectura',
  },
}

/** Orden en que se muestran las secciones. */
export const SECTION_ORDER: ParameterSection[] = [
  'couriers',
  'orders',
  'closing',
  'pickup',
  'data',
  'inactive',
  'technical',
]

export const PARAMETER_CATALOG: Record<string, ParameterInfo> = {
  // ── Activos: el backend los lee ─────────────────────────────────────────────
  'limits.max_concurrent_orders_per_courier': {
    label: 'Pedidos que puede llevar cada repartidor a la vez',
    help: 'Cuando un repartidor llega a este número de pedidos en curso, deja de aparecer como disponible en el mapa de asignación. Los pedidos ya entregados no cuentan.',
    unit: 'pedidos',
    section: 'couriers',
    active: true,
  },
  'order.draft_expiration_minutes': {
    label: 'Tiempo que se guarda un carrito sin confirmar',
    help: 'Si un comprador arma un carrito y no confirma el pedido, se descarta pasado este tiempo. 1440 minutos = 24 horas.',
    unit: 'minutos',
    section: 'orders',
    active: true,
  },
  'order.pending_confirm_timeout_minutes': {
    label: 'Tiempo para terminar de confirmar un pedido',
    help: 'Si el comprador empezó a confirmar el pedido y no lo terminó, el pedido vence pasado este tiempo.',
    unit: 'minutos',
    section: 'orders',
    active: true,
  },
  'order.pending_online_payment_timeout_minutes': {
    label: 'Tiempo para pagar en línea',
    help: 'Para pedidos con pago en línea (tarjeta, PSE o link de Nequi): si no se recibe el pago en este tiempo, el pedido se cancela. Si usas el link de Nequi, dale un margen amplio, porque el pago lo confirmas tú a mano.',
    unit: 'minutos',
    section: 'orders',
    active: true,
  },
  'closure.auto_confirm_delivered_hours': {
    label: 'Confirmación automática de la entrega',
    help: 'Después de entregado, el comprador puede confirmar que recibió bien su pedido. Si no lo hace, se da por confirmado solo pasado este tiempo y el pedido se cierra.',
    unit: 'horas',
    section: 'closing',
    active: true,
  },
  'pickup.expiration_hours': {
    label: 'Tiempo que un pedido espera en el punto de recogida',
    help: 'Si el comprador no pasa a recoger su pedido en este tiempo, el pedido vence.',
    unit: 'horas',
    section: 'pickup',
    active: true,
  },
  'storage.evidence_retention_days': {
    label: 'Días que se guardan las fotos de los recibos de cobro',
    help: 'Las fotos que toma el repartidor al cobrar se borran automáticamente pasado este tiempo.',
    unit: 'días',
    section: 'data',
    active: true,
  },
  'cleanup.guest_orphan_minutes': {
    label: 'Limpieza de visitantes que no compraron',
    help: 'Quien entra a la tienda y empieza a pedir sin cuenta queda registrado como visitante. Si no llega a hacer ningún pedido, se borra pasado este tiempo.',
    unit: 'minutos',
    section: 'data',
    active: true,
  },

  // ── Sin efecto todavía (el backend no los lee) ──────────────────────────────
  'limits.max_couriers_per_client': {
    label: 'Máximo de repartidores activos',
    help: 'Límite de repartidores activos que puede tener el negocio.',
    section: 'inactive',
  },
  'limits.max_active_recurrences_per_buyer': {
    label: 'Pedidos recurrentes activos por comprador',
    help: 'Cuántos pedidos recurrentes puede tener activos un mismo comprador.',
    section: 'inactive',
  },
  'limits.max_buyer_addresses': {
    label: 'Direcciones guardadas por comprador',
    help: 'Cuántas direcciones puede guardar un comprador en su cuenta.',
    section: 'inactive',
  },
  'limits.max_pickup_points_per_client': {
    label: 'Máximo de puntos de recogida',
    help: 'Cuántos puntos físicos de recogida puede tener el negocio.',
    section: 'inactive',
  },
  'limits.max_api_keys_per_client': {
    label: 'Máximo de llaves de API',
    help: 'Cuántas llaves de API activas puede tener el negocio (integraciones).',
    section: 'inactive',
  },
  'order.seller_confirmation_timeout_hours': {
    label: 'Tiempo para aceptar un pedido nuevo',
    help: 'Tiempo que tiene el negocio para aceptar un pedido antes de que se cancele.',
    unit: 'horas',
    section: 'inactive',
  },
  'order.manual_review_sla_hours': {
    label: 'Tiempo para revisar un pedido en revisión manual',
    help: 'Plazo para resolver un pedido que quedó en revisión.',
    unit: 'horas',
    section: 'inactive',
  },
  'order.validation_max_duration_minutes': {
    label: 'Tiempo máximo de validación automática',
    help: 'Cuánto puede tardar la validación automática de un pedido.',
    unit: 'minutos',
    section: 'inactive',
  },
  'ship.courier_assignment_timeout_minutes': {
    label: 'Aviso si un pedido lleva mucho sin repartidor',
    help: 'Tiempo sin asignar repartidor antes de avisar.',
    unit: 'minutos',
    section: 'inactive',
  },
  'ship.preparation_max_hours': {
    label: 'Aviso si un pedido lleva mucho en preparación',
    help: 'Tiempo en preparación antes de avisar.',
    unit: 'horas',
    section: 'inactive',
  },
  'ship.in_transit_max_hours': {
    label: 'Aviso si un pedido lleva mucho en camino',
    help: 'Tiempo en camino antes de avisar.',
    unit: 'horas',
    section: 'inactive',
  },
  'ship.delivery_attempt_max_retries': {
    label: 'Intentos de entrega antes de devolver el pedido',
    help: 'Cuántas veces se intenta entregar antes de devolver el pedido al negocio.',
    unit: 'veces',
    section: 'inactive',
  },
  'ship.delivery_attempt_retry_hours': {
    label: 'Tiempo entre intentos de entrega',
    help: 'Cuánto esperar entre un intento de entrega fallido y el siguiente.',
    unit: 'horas',
    section: 'inactive',
  },
  'ship.cancel_request_review_hours': {
    label: 'Tiempo para responder una solicitud de cancelación',
    help: 'Plazo para aprobar o rechazar cuando un comprador pide cancelar un pedido en camino.',
    unit: 'horas',
    section: 'inactive',
  },
  'pickup.notification_reminder_hours': {
    label: 'Recordatorio antes de que venza un pedido para recoger',
    help: 'Con cuánta anticipación avisar al comprador que su pedido para recoger está por vencer.',
    unit: 'horas',
    section: 'inactive',
  },
  'closure.dispute_window_hours': {
    label: 'Plazo para reclamar un pedido entregado',
    help: 'Tiempo que tiene el comprador para abrir un reclamo después de la entrega.',
    unit: 'horas',
    section: 'inactive',
  },
  'collection.evidence_required': {
    label: 'Foto del recibo obligatoria al cobrar',
    help: 'Si el repartidor debe tomar foto del recibo al cobrar contra entrega. Hoy siempre es obligatoria.',
    section: 'inactive',
  },
  'collection.cash_change_max_amount': {
    label: 'Devuelta máxima en efectivo',
    help: 'Monto de devuelta a partir del cual se genera una alerta.',
    unit: 'COP',
    section: 'inactive',
  },
  'collection.electronic_retry_max_attempts': {
    label: 'Reintentos de cobro electrónico',
    help: 'Cuántas veces se puede reintentar un cobro con datáfono o transferencia.',
    unit: 'veces',
    section: 'inactive',
  },
  'recurrence.generation_lookahead_hours': {
    label: 'Anticipación para crear pedidos recurrentes',
    help: 'Con cuántas horas de anticipación se crea el siguiente pedido de una recurrencia.',
    unit: 'horas',
    section: 'inactive',
  },
  'recurrence.max_skipped_cycles': {
    label: 'Ciclos fallidos antes de pausar una recurrencia',
    help: 'Si un pedido recurrente falla estas veces seguidas, la recurrencia se pausa.',
    unit: 'veces',
    section: 'inactive',
  },
  'refund.processing_sla_business_days': {
    label: 'Plazo para hacer un reembolso',
    help: 'Días hábiles que tiene el negocio para devolver el dinero.',
    unit: 'días hábiles',
    section: 'inactive',
  },
  'refund.provider_response_timeout_hours': {
    label: 'Espera de respuesta de la pasarela en reembolsos',
    help: 'Tiempo máximo esperando la respuesta de la pasarela de pagos.',
    unit: 'horas',
    section: 'inactive',
  },
  'return.review_sla_hours': {
    label: 'Tiempo para aprobar una devolución',
    help: 'Plazo para responder a una solicitud de devolución.',
    unit: 'horas',
    section: 'inactive',
  },
  'return.review_auto_action': {
    label: 'Qué pasa si no respondes una devolución a tiempo',
    help: 'APPROVE = se aprueba sola; REJECT = se rechaza sola.',
    section: 'inactive',
  },
  'return.buyer_ships_deadline_days': {
    label: 'Plazo para que el comprador envíe la devolución',
    help: 'Días que tiene el comprador para despachar el producto devuelto.',
    unit: 'días',
    section: 'inactive',
  },
  'return.pickup_schedule_max_attempts': {
    label: 'Intentos para recoger una devolución',
    help: 'Cuántas veces se intenta recoger un producto devuelto.',
    unit: 'veces',
    section: 'inactive',
  },
  'catalog.bulk_import_max_rows': {
    label: 'Máximo de filas al cargar productos desde Excel',
    help: 'Tamaño máximo del archivo de carga masiva de productos.',
    unit: 'filas',
    section: 'inactive',
  },
  'catalog.default_currency': {
    label: 'Moneda',
    help: 'Moneda de los precios. Hoy siempre es COP.',
    section: 'inactive',
  },
  'storage.product_image_max_count': {
    label: 'Fotos máximas por producto',
    help: 'Cuántas fotos se pueden subir por producto.',
    unit: 'imágenes',
    section: 'inactive',
  },
  'map.default_center_lat': {
    label: 'Centro del mapa (latitud)',
    help: 'Punto donde arranca el mapa. Hoy el mapa se centra en tus pedidos.',
    section: 'inactive',
  },
  'map.default_center_lng': {
    label: 'Centro del mapa (longitud)',
    help: 'Punto donde arranca el mapa. Hoy el mapa se centra en tus pedidos.',
    section: 'inactive',
  },
  'notifications.email_enabled': {
    label: 'Notificaciones por correo',
    help: 'El aviso de entrega por correo se configura en la pestaña «Correos».',
    section: 'inactive',
  },
  'notifications.sms_enabled': {
    label: 'Notificaciones por SMS',
    help: 'Envío de mensajes de texto. Aún no disponible.',
    section: 'inactive',
  },
  'notifications.push_enabled': {
    label: 'Notificaciones push',
    help: 'Notificaciones en el celular. Aún no disponibles.',
    section: 'inactive',
  },

  // ── Integraciones (las carga RUTA) ──────────────────────────────────────────
  'integrations.instagram_access_token': {
    label: 'Instagram conectado',
    help: 'Permite que tu página muestre tus últimas publicaciones. Lo configura el equipo de RUTA; aparece oculto por seguridad.',
    section: 'technical',
  },
  'integrations.instagram_token_refreshed_at': {
    label: 'Última renovación de la conexión con Instagram',
    help: 'Se renueva sola cada semana.',
    section: 'technical',
  },
}

/** Nombres para los ajustes técnicos que no están en el catálogo. */
const TECHNICAL_PREFIX_LABELS: Record<string, string> = {
  auth: 'Seguridad e inicio de sesión',
  ratelimit: 'Límite de peticiones',
  webhook: 'Webhooks',
  session: 'Sesiones',
  idempotency: 'Operaciones duplicadas',
  control_view: 'Vista de Control',
  storage: 'Archivos',
  map: 'Mapa',
  catalog: 'Catálogo',
}

/**
 * Información de un parámetro. Los que no están en el catálogo (técnicos de
 * RUTA o nuevos) caen en una descripción genérica legible en vez de la clave.
 */
export function parameterInfo(key: string, fixedByRuta: boolean): ParameterInfo {
  const known = PARAMETER_CATALOG[key]
  if (known) return fixedByRuta && known.section !== 'technical' ? { ...known, section: 'technical' } : known

  const [prefix = '', ...rest] = key.split('.')
  const area = TECHNICAL_PREFIX_LABELS[prefix] ?? 'General'
  const name = rest.join(' ').replace(/_/g, ' ')
  return {
    label: `${area}: ${name}`,
    help: '',
    section: fixedByRuta ? 'technical' : 'inactive',
  }
}

/** Texto de apoyo para valores en minutos u horas largos («1440 minutos = 24 horas»). */
export function humanizeDuration(value: string, unit?: ParameterInfo['unit']): string | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  if (unit === 'minutos' && n >= 60) {
    const h = n / 60
    return h >= 24 && Number.isInteger(h / 24)
      ? `= ${h / 24} ${h / 24 === 1 ? 'día' : 'días'}`
      : `= ${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? 'hora' : 'horas'}`
  }
  if (unit === 'horas' && n >= 24 && Number.isInteger(n / 24)) {
    return `= ${n / 24} ${n / 24 === 1 ? 'día' : 'días'}`
  }
  return null
}
