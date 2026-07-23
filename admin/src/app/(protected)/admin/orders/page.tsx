'use client'

import Link from 'next/link'
import { useContext, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  listOrders,
  type ApiError,
  type OrderListFilters,
  type OrderOrigin,
  type OrderStatus,
  type OrderSummary,
  type PaymentStatus,
} from '@/lib/orders.api'
import {
  adminStatusLabel,
  adminStatusColor,
  STATUS_BADGE_CLASSES,
} from '@/lib/admin_status_labels'

const PAGE_SIZE = 20

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        STATUS_BADGE_CLASSES[adminStatusColor(status)],
      ].join(' ')}
    >
      {adminStatusLabel(status)}
    </span>
  )
}

// Subconjunto de estados por los que tiene sentido filtrar; las etiquetas salen
// del diccionario compartido para que no se desvíen de las de la tabla.
// DRAFT no está: es el carrito del comprador y el backend nunca lo lista aquí.
const FILTERABLE_STATUSES: OrderStatus[] = [
  'VALIDATION_APPROVED',
  'SELLER_CONFIRMED',
  'PREPARING',
  'AWAITING_COURIER_ASSIGNMENT',
  'READY_TO_SHIP',
  'READY_FOR_PICKUP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'ARRIVED_AT_CUSTOMER',
  'PAYMENT_COLLECTED_CASH',
  'PAYMENT_COLLECTED_ELECTRONIC',
  'DELIVERED',
  'CONFIRMED_BY_CUSTOMER',
  'CONFIRMED_BY_SYSTEM',
  'CUSTOMER_CANCEL_REQUEST',
  'CANCELLED_BY_ADMIN',
  'CANCELLED_BY_CUSTOMER',
  'COMPLETED_SUCCESSFULLY',
]

const ORDER_STATUS_OPTIONS: Array<[OrderStatus | '', string]> = [
  ['', 'Todos los estados'],
  ...FILTERABLE_STATUSES.map((status) => [status, adminStatusLabel(status)] as [OrderStatus, string]),
]

const PAYMENT_STATUS_OPTIONS: Array<[PaymentStatus | '', string]> = [
  ['', 'Todos los pagos'],
  ['PAYMENT_NOT_STARTED', 'Sin iniciar'],
  ['PENDING_ONLINE_PAYMENT', 'Pend. pago online'],
  ['PAYMENT_PROCESSING', 'Procesando'],
  ['PAID', 'Pagado'],
  ['PAYMENT_FAILED_RETRYABLE', 'Fallo (reintentable)'],
  ['PAYMENT_REJECTED_FINAL', 'Rechazado (final)'],
  ['PENDING_COLLECTION', 'Pend. cobro (COD)'],
  ['COLLECTION_PROCESSING', 'Cobrando (COD)'],
  ['PAYMENT_COLLECTED', 'Cobrado (COD)'],
  ['PAYMENT_COLLECTION_FAILED', 'Cobro fallido (COD)'],
  ['PAYMENT_NOT_COLLECTED', 'No cobrado'],
]

const SELECT_CLASS =
  'rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100'

const INPUT_CLASS =
  'rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

export default function AdminOrdersPage() {
  const session = useContext(SessionContext)

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [draftQ, setDraftQ] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [orderOrigin, setOrderOrigin] = useState<OrderOrigin | ''>('')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const filters: OrderListFilters = {
        page,
        page_size: PAGE_SIZE,
        q: q || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        order_origin: orderOrigin || undefined,
      }

      try {
        const data = await listOrders(filters)
        if (!active) return
        setOrders(data.data ?? [])
        setTotal(data.pagination?.total ?? 0)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar los pedidos.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => { active = false }
  }, [isAllowed, page, q, status, paymentStatus, dateFrom, dateTo, orderOrigin])

  function applySearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    setQ(draftQ.trim())
  }

  function resetFilters() {
    setDraftQ('')
    setQ('')
    setStatus('')
    setPaymentStatus('')
    setDateFrom('')
    setDateTo('')
    setOrderOrigin('')
    setPage(1)
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="pedidos" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            operaciones
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Pedidos
          </h1>
        </div>
        <Link
          href="/admin/orders/corporate/new"
          className="mt-1 inline-flex items-center rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-500/[0.2] dark:border-violet-400/25 dark:text-violet-300"
        >
          + Nuevo pedido corporativo
        </Link>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Filtros" subtitle="búsqueda" />

        {/* Filtro por origen */}
        <div className="mb-3 flex gap-2">
          {(['', 'UI', 'API'] as Array<OrderOrigin | ''>) .map((origin) => (
            <button
              key={origin}
              type="button"
              onClick={() => { setOrderOrigin(origin); setPage(1) }}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                orderOrigin === origin
                  ? origin === 'API'
                    ? 'border-sky-400/40 bg-sky-500/[0.18] text-sky-700 dark:border-sky-400/25 dark:text-sky-300'
                    : 'border-violet-400/40 bg-violet-500/[0.12] text-violet-700 dark:border-violet-400/25 dark:text-violet-300'
                  : 'border-slate-200 bg-white/[0.06] text-slate-500 hover:text-slate-700 dark:border-white/10 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              {origin === '' ? 'Todos' : origin}
            </button>
          ))}
        </div>

        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Buscar por comprador o #pedido"
            className={INPUT_CLASS}
          />

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1) }}
            className={SELECT_CLASS}
          >
            {ORDER_STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value as PaymentStatus | ''); setPage(1) }}
            className={SELECT_CLASS}
          >
            {PAYMENT_STATUS_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className={INPUT_CLASS + ' flex-1'}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className={INPUT_CLASS + ' flex-1'}
            />
          </div>

          <div className="flex gap-2">
            <RutaButton type="submit" variant="primary" className="justify-center">
              Filtrar
            </RutaButton>
            <RutaButton type="button" variant="neutral" onClick={resetFilters}>
              Limpiar
            </RutaButton>
          </div>
        </form>
      </RutaCard>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <RutaCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader
            title="Lista de pedidos"
            subtitle={loading ? 'cargando…' : `${total} registros`}
            className="mb-0"
          />
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Cargando pedidos…</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No hay pedidos para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
              <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Comprador</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Repartidor</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="text-slate-700 hover:bg-slate-50/[0.5] dark:text-slate-300 dark:hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        #{order.id}
                        {order.order_origin === 'API' && (
                          <span className="inline-flex items-center rounded border border-sky-400/40 bg-sky-500/[0.18] px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:border-sky-400/25 dark:text-sky-300">
                            API
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {order.buyer_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {order.item_count}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {formatCOP(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.order_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {order.courier_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-500/[0.2] dark:border-violet-400/25 dark:text-violet-300"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200/90 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <RutaButton
              type="button"
              size="sm"
              variant="neutral"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </RutaButton>
            <RutaButton
              type="button"
              size="sm"
              variant="neutral"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </RutaButton>
          </div>
        </div>
      </RutaCard>
    </div>
  )
}
