'use client'

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getOrdersForMap,
  getAvailableCouriers,
  assignCourier,
  isAssigned,
  type MapOrder,
  type AvailableCourier,
  type ApiError,
} from '@/lib/assignment.api'
import { AssignmentMap } from './AssignmentMap'
import { OrdersPanel } from './OrdersPanel'
import { AssignmentModal } from './AssignmentModal'
import { MapLegend } from './map_legend'

const REFRESH_INTERVAL_MS = 30_000

/** Qué pedidos muestra el mapa. Coincide con las opciones del selector. */
type StatusFilter = 'ALL' | 'PENDING' | 'ASSIGNED'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ASSIGNED', label: 'En reparto' },
  { value: 'PENDING', label: 'Pedidos por asignar' },
  { value: 'ALL', label: 'Todos' },
]

export function AssignmentMapView() {
  const session = useContext(SessionContext)

  const [orders, setOrders] = useState<MapOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  // Vacío = todas las fechas. Arranca así a propósito: abrir el mapa y no ver
  // nada porque hoy no hay entregas programadas sería desconcertante.
  const [dateFilter, setDateFilter] = useState('')
  // Con un día elegido, el filtro es estricto: solo los programados para ese
  // día. Los que no tienen fecha se pueden traer de vuelta a mano, porque
  // esconder trabajo por despachar sin avisar sería peor que no filtrar.
  const [includeUndated, setIncludeUndated] = useState(false)

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [couriers, setCouriers] = useState<AvailableCourier[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)

  // Pedido cuyo modal de asignación está abierto.
  const [assigningOrder, setAssigningOrder] = useState<MapOrder | null>(null)

  // Toast feedback
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Map pan callback ───────────────────────────────────────────────────────
  const [focusOrder, setFocusOrder] = useState<MapOrder | null>(null)

  // ── Deselección al hacer clic fuera ───────────────────────────────────────
  const mapAreaRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedOrderId === null) return
    // Con el modal abierto la selección debe mantenerse: el clic pertenece a la
    // confirmación en curso, no a un intento de salir de la selección.
    if (assigningOrder) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      // El panel también es zona de trabajo: desde ahí se eligen pedidos, así
      // que un clic suyo no puede deshacer lo que acaba de seleccionar.
      if (mapAreaRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return

      setSelectedOrderId(null)
      setFocusOrder(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [selectedOrderId, assigningOrder])

  // ── Permission check ──────────────────────────────────────────────────────
  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  // ── Load orders ───────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!isAllowed) return
    try {
      const data = await getOrdersForMap()
      setOrders(data)
      setOrdersError(null)
    } catch (err) {
      const apiErr = err as ApiError
      setOrdersError(apiErr.message ?? 'No pudimos cargar los pedidos del mapa.')
    } finally {
      setLoadingOrders(false)
    }
  }, [isAllowed])

  useEffect(() => {
    void loadOrders()
    const interval = setInterval(() => void loadOrders(), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadOrders])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  // Se filtra en el cliente y no en el servidor: el mapa ya trae solo los
  // pedidos activos (un conjunto acotado), así que cambiar de filtro es
  // instantáneo y no parpadea con el refresco de cada 30 s.
  const byStatus = useMemo(
    () =>
      orders.filter((order) => {
        if (statusFilter === 'PENDING' && isAssigned(order)) return false
        if (statusFilter === 'ASSIGNED' && !isAssigned(order)) return false
        return true
      }),
    [orders, statusFilter],
  )

  const visibleOrders = useMemo(() => {
    if (!dateFilter) return byStatus
    return byStatus.filter((order) => {
      if (order.scheduled_delivery_date === dateFilter) return true
      return includeUndated && !order.scheduled_delivery_date
    })
  }, [byStatus, dateFilter, includeUndated])

  // Cuántos quedaron fuera solo por no tener día asignado. Se avisa en pantalla
  // para que el filtro no esconda trabajo en silencio.
  const undatedHiddenCount = useMemo(() => {
    if (!dateFilter || includeUndated) return 0
    return byStatus.filter((o) => !o.scheduled_delivery_date).length
  }, [byStatus, dateFilter, includeUndated])

  // Si el pedido seleccionado deja de estar visible al cambiar un filtro, la
  // selección se suelta: mantenerla dejaría el mapa centrado en un pin ausente.
  useEffect(() => {
    if (selectedOrderId === null) return
    if (visibleOrders.some((o) => o.id === selectedOrderId)) return
    setSelectedOrderId(null)
    setFocusOrder(null)
  }, [visibleOrders, selectedOrderId])

  // ── Repartidores: solo se piden al abrir el modal ────────────────────────
  // Antes se cargaban al seleccionar un pedido, aunque el operador solo
  // estuviera mirando el mapa; ahora la lista se pide cuando de verdad se va a
  // usar, y así llega recién consultada al momento de decidir.
  useEffect(() => {
    if (!assigningOrder) {
      setCouriers([])
      return
    }

    let active = true
    setLoadingCouriers(true)

    getAvailableCouriers(assigningOrder.id)
      .then((data) => {
        if (!active) return
        setCouriers(data)
      })
      .catch(() => {
        if (!active) return
        setCouriers([])
      })
      .finally(() => {
        if (active) setLoadingCouriers(false)
      })

    return () => {
      active = false
    }
  }, [assigningOrder])

  // ── Toast helper ─────────────────────────────────────────────────────────
  function showToast(kind: 'success' | 'error', message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ kind, message })
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }

  // ── Select order (from map or panel) ─────────────────────────────────────
  function handleSelectOrder(orderId: number) {
    setSelectedOrderId(orderId)
    const order = orders.find((o) => o.id === orderId)
    if (order) setFocusOrder(order)
  }

  // ── Abrir el modal de asignación de un pedido ────────────────────────────
  function handleRequestAssign(order: MapOrder) {
    // Se selecciona también en el mapa: al abrir el modal el operador ve en el
    // pin de qué pedido se trata.
    handleSelectOrder(order.id)
    setAssigningOrder(order)
  }

  // ── Confirm assignment ────────────────────────────────────────────────────
  async function handleConfirmAssign(courier: AvailableCourier) {
    if (!assigningOrder) return

    await assignCourier(assigningOrder.id, courier.id)
    setAssigningOrder(null)
    setSelectedOrderId(null)
    setCouriers([])
    showToast('success', `Repartidor ${courier.full_name} asignado correctamente.`)
    void loadOrders()
  }

  // ── Cancel modal ─────────────────────────────────────────────────────────
  function handleCancelModal() {
    setAssigningOrder(null)
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="mapa" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Título + filtros: los dos selectores van al lado del título porque
          gobiernan a la vez el mapa y el panel, no solo una de las dos zonas. */}
      <div className="u-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            operaciones
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Mapa de asignación
          </h1>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="map-status-filter"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            >
              Mostrar
            </label>
            <select
              id="map-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:border-brand-400/60 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="map-date-filter"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            >
              Día de entrega
            </label>
            <input
              id="map-date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors hover:border-brand-400/60 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100"
            />
          </div>

          {dateFilter && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('')
                setIncludeUndated(false)
              }}
              className="pb-2 text-xs font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
            >
              Ver todas las fechas
            </button>
          )}
        </div>
      </div>

      {/* Convenciones de color: inline, para no gastar una tarjeta del panel. */}
      <MapLegend />

      {/* El filtro por día es estricto, así que hay que decir en voz alta
          cuántos pedidos quedaron fuera por no tener fecha asignada. */}
      {undatedHiddenCount > 0 && (
        <p className="u-in rounded-lg border border-amber-400/30 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {undatedHiddenCount === 1
            ? 'Hay 1 pedido sin día de entrega asignado que no se muestra con este filtro.'
            : `Hay ${undatedHiddenCount} pedidos sin día de entrega asignado que no se muestran con este filtro.`}{' '}
          <button
            type="button"
            onClick={() => setIncludeUndated(true)}
            className="font-semibold underline underline-offset-2"
          >
            Incluirlos
          </button>
        </p>
      )}

      {dateFilter && includeUndated && (
        <p className="u-in rounded-lg border border-slate-300/40 bg-slate-500/[0.08] px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
          Se están mostrando también los pedidos sin día de entrega asignado.{' '}
          <button
            type="button"
            onClick={() => setIncludeUndated(false)}
            className="font-semibold underline underline-offset-2"
          >
            Ocultarlos
          </button>
        </p>
      )}

      {ordersError && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {ordersError}
        </p>
      )}

      {/* Toast */}
      {toast && (
        <p
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={[
            'u-in-right rounded-lg border px-3 py-2 text-sm shadow-sm',
            toast.kind === 'success'
              ? 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300'
              : 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300',
          ].join(' ')}
        >
          {toast.message}
        </p>
      )}

      {/* Main content: map + panel */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Map */}
        {/* `isolate` confina los z-index internos del mapa a este contenedor;
            si no, sus controles pueden pintarse sobre cualquier modal. */}
        <div
          ref={mapAreaRef}
          className="isolate min-h-[400px] flex-1 overflow-hidden rounded-lg border border-slate-200/90 dark:border-white/10"
        >
          {loadingOrders ? (
            <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-[#1d2025]">
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando mapa…</p>
            </div>
          ) : (
            <AssignmentMap
              orders={visibleOrders}
              selectedOrderId={selectedOrderId}
              focusOrder={focusOrder}
              onSelectOrder={handleSelectOrder}
            />
          )}
        </div>

        {/* Side panel: un solo rectángulo con los pedidos filtrados. */}
        <div ref={panelRef} className="w-80 shrink-0 lg:w-96">
          <OrdersPanel
            orders={visibleOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
            onRequestAssign={handleRequestAssign}
          />
        </div>
      </div>

      {/* Assignment modal */}
      {assigningOrder && (
        <AssignmentModal
          order={assigningOrder}
          couriers={couriers}
          loadingCouriers={loadingCouriers}
          onConfirm={handleConfirmAssign}
          onCancel={handleCancelModal}
        />
      )}
    </div>
  )
}
