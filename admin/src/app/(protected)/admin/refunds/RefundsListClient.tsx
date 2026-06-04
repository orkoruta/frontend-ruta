'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  listRefunds,
  type Refund,
  type RefundListFilters,
  type RefundStatus,
} from '@/lib/refunds.api'
import { RefundStatusPill } from './_components/RefundStatusPill'

const STATUS_OPTIONS: { value: RefundStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PROCESSING', label: 'En proceso' },
  { value: 'PROVIDER_REQUESTED', label: 'Solicitado a proveedor' },
  { value: 'REFUNDED', label: 'Reembolsado' },
  { value: 'PARTIALLY_REFUNDED', label: 'Reembolso parcial' },
  { value: 'FAILED', label: 'Fallido' },
]

const MODALITY_LABELS: Record<string, string> = {
  STORE_CREDIT: 'Crédito en tienda',
  BANK_REFUND: 'Devolución bancaria',
}

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

export default function RefundsListClient() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RefundListFilters>({ page: 1, page_size: 20 })
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await listRefunds(filters)
        if (!active) return
        setRefunds(res.data)
        setTotal(res.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar los reembolsos.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [filters])

  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 20
  const totalPages = Math.ceil(total / pageSize)

  function setStatus(status: RefundStatus | '') {
    setFilters((f) => ({ ...f, status: status || undefined, page: 1 }))
  }

  function setDateFrom(from: string) {
    setFilters((f) => ({ ...f, from: from || undefined, page: 1 }))
  }

  function setDateTo(to: string) {
    setFilters((f) => ({ ...f, to: to || undefined, page: 1 }))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            reembolsos
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Gestión de reembolsos
          </h1>
        </div>
      </div>

      {/* Filters */}
      <RutaCard>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Estado
            </label>
            <select
              value={filters.status ?? ''}
              onChange={(e) => setStatus(e.target.value as RefundStatus | '')}
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Desde
            </label>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Hasta
            </label>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>
        </div>
      </RutaCard>

      {/* Table */}
      <RutaCard>
        <RutaSectionHeader
          title={`Reembolsos (${total})`}
          subtitle="lista paginada"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : refunds.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No hay reembolsos con los filtros seleccionados.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-white/10">
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      ID
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Pedido
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Modalidad
                    </th>
                    <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Monto
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Estado
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Fecha
                    </th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.07]">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-white/[0.04]">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        #{refund.id}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/orders/${refund.order_id}`}
                          className="text-sky-600 hover:underline dark:text-sky-400"
                        >
                          #{refund.order_id}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <ModalityBadge modality={refund.refund_modality} />
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCOP(refund.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        <RefundStatusPill status={refund.status} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(refund.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/refunds/${refund.id}`}
                          className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-4 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Página {page} de {totalPages} · {total} registros
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                    disabled={page <= 1}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </RutaCard>
    </div>
  )
}

function ModalityBadge({ modality }: { modality: string }) {
  const isStore = modality === 'STORE_CREDIT'
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        isStore
          ? 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300'
          : 'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
      ].join(' ')}
    >
      {MODALITY_LABELS[modality] ?? modality}
    </span>
  )
}
