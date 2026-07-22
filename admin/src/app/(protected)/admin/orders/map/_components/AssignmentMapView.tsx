'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getOrdersForMap,
  getAvailableCouriers,
  assignCourier,
  type MapOrder,
  type AvailableCourier,
  type ApiError,
} from '@/lib/assignment.api'
import { AssignmentMap } from './AssignmentMap'
import { PendingOrdersPanel } from './PendingOrdersPanel'
import { AssignmentModal } from './AssignmentModal'

const REFRESH_INTERVAL_MS = 30_000

export function AssignmentMapView() {
  const session = useContext(SessionContext)

  const [orders, setOrders] = useState<MapOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [couriers, setCouriers] = useState<AvailableCourier[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)

  // Modal state
  const [pendingAssignment, setPendingAssignment] = useState<{
    order: MapOrder
    courier: AvailableCourier
  } | null>(null)

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
    if (pendingAssignment) return

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
  }, [selectedOrderId, pendingAssignment])

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

  // ── Load couriers when order is selected ─────────────────────────────────
  useEffect(() => {
    if (selectedOrderId === null) {
      setCouriers([])
      return
    }

    let active = true
    setLoadingCouriers(true)

    getAvailableCouriers(selectedOrderId)
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
  }, [selectedOrderId])

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

  // ── Request assignment confirmation ──────────────────────────────────────
  function handleRequestAssign(order: MapOrder, courier: AvailableCourier) {
    setPendingAssignment({ order, courier })
  }

  // ── Confirm assignment ────────────────────────────────────────────────────
  async function handleConfirmAssign() {
    if (!pendingAssignment) return

    await assignCourier(pendingAssignment.order.id, pendingAssignment.courier.id)
    setPendingAssignment(null)
    setSelectedOrderId(null)
    setCouriers([])
    showToast('success', `Repartidor ${pendingAssignment.courier.full_name} asignado correctamente.`)
    void loadOrders()
  }

  // ── Cancel modal ─────────────────────────────────────────────────────────
  function handleCancelModal() {
    setPendingAssignment(null)
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

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page title */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          operaciones
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Mapa de asignación
        </h1>
      </div>

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
            'rounded-md border px-3 py-2 text-sm',
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
              orders={orders}
              selectedOrderId={selectedOrderId}
              focusOrder={focusOrder}
              onSelectOrder={handleSelectOrder}
            />
          )}
        </div>

        {/* Side panel */}
        <div ref={panelRef} className="w-80 shrink-0 overflow-y-auto lg:w-96">
          <PendingOrdersPanel
            orders={orders}
            selectedOrderId={selectedOrderId}
            couriers={couriers}
            loadingCouriers={loadingCouriers}
            onSelectOrder={handleSelectOrder}
            onRequestAssign={handleRequestAssign}
          />
        </div>
      </div>

      {/* Assignment modal */}
      {pendingAssignment && (
        <AssignmentModal
          order={pendingAssignment.order}
          courier={pendingAssignment.courier}
          onConfirm={handleConfirmAssign}
          onCancel={handleCancelModal}
        />
      )}
    </div>
  )
}
