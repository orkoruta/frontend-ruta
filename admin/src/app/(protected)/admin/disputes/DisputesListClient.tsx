'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  listDisputes,
  startDisputeReview,
  type Dispute,
  type DisputeListFilters,
  type DisputeStatus,
} from '@/lib/disputes.api'
import { DisputeStatusPill } from './_components/DisputeStatusPill'

const STATUS_OPTIONS: { value: DisputeStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'DISPUTED', label: 'Disputa abierta' },
  { value: 'DISPUTE_UNDER_REVIEW', label: 'En revisión' },
  { value: 'DISPUTE_RESOLVED_NO_ACTION', label: 'Resuelta: sin acción' },
  { value: 'DISPUTE_RESOLVED_WITH_RETURN', label: 'Resuelta: con devolución' },
  { value: 'DISPUTE_RESOLVED_WITH_REFUND', label: 'Resuelta: con reembolso' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function DisputesListClient() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<DisputeListFilters>({ page: 1, page_size: 20 })
  const [total, setTotal] = useState(0)
  const [acting, setActing] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await listDisputes(filters)
        if (!active) return
        setDisputes(res.data)
        setTotal(res.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar las disputas.')
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

  function setStatus(status: DisputeStatus | '') {
    setFilters((f) => ({ ...f, status: status || undefined, page: 1 }))
  }

  async function handleStartReview(id: number) {
    setActing(id)
    setActionError(null)
    try {
      const updated = await startDisputeReview(id)
      setDisputes((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } catch (err) {
      const apiErr = err as { message?: string }
      setActionError(apiErr.message ?? 'No pudimos iniciar la revisión.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            disputas
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Gestión de disputas
          </h1>
        </div>
      </div>

      {/* Filtros */}
      <RutaCard>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Estado
            </label>
            <select
              value={filters.status ?? ''}
              onChange={(e) => setStatus(e.target.value as DisputeStatus | '')}
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </RutaCard>

      {actionError && (
        <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {actionError}
        </p>
      )}

      {/* Tabla */}
      <RutaCard>
        <RutaSectionHeader
          title={`Disputas (${total})`}
          subtitle="lista paginada"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : disputes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No hay disputas con los filtros seleccionados.
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
                      Comprador
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Estado
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Razón
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Fecha
                    </th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.07]">
                  {disputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-white/[0.04]">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        #{dispute.id}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {dispute.buyer_name ?? `Comprador #${dispute.buyer_id}`}
                        </div>
                        {dispute.buyer_email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {dispute.buyer_email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <DisputeStatusPill status={dispute.status} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-400">
                        {dispute.reason ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(dispute.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {dispute.status === 'DISPUTED' && (
                            <RutaButton
                              type="button"
                              variant="primary"
                              disabled={acting === dispute.id}
                              onClick={() => void handleStartReview(dispute.id)}
                            >
                              {acting === dispute.id ? 'Iniciando…' : 'Iniciar revisión'}
                            </RutaButton>
                          )}
                          {dispute.status === 'DISPUTE_UNDER_REVIEW' && (
                            <Link
                              href={`/admin/disputes/${dispute.id}`}
                              className="inline-flex items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/[0.2] dark:text-emerald-300"
                            >
                              Resolver
                            </Link>
                          )}
                          <Link
                            href={`/admin/disputes/${dispute.id}`}
                            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
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
