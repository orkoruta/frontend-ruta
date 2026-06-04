'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  listRecurrenceTemplates,
  pauseTemplate,
  resumeTemplate,
  cancelTemplate,
  type RecurrenceTemplate,
  type RecurrenceListFilters,
  type RecurrenceStatus,
} from '@/lib/recurrence.api'
import { RecurrenceStatusPill } from './_components/RecurrenceStatusPill'

const STATUS_OPTIONS: { value: RecurrenceStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'RECURRENCE_ACTIVE', label: 'Activas' },
  { value: 'RECURRENCE_PAUSED', label: 'Pausadas' },
  { value: 'RECURRENCE_CANCELLED', label: 'Canceladas' },
]

const PERIODICITY_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Personalizada',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function RecurrenceListClient() {
  const [templates, setTemplates] = useState<RecurrenceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecurrenceListFilters>({ page: 1, page_size: 20 })
  const [total, setTotal] = useState(0)
  const [acting, setActing] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await listRecurrenceTemplates(filters)
        if (!active) return
        setTemplates(res.data)
        setTotal(res.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar las plantillas de recurrencia.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [filters])

  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 20
  const totalPages = Math.ceil(total / pageSize)

  function setStatus(status: RecurrenceStatus | '') {
    setFilters((f) => ({ ...f, status: status || undefined, page: 1 }))
  }

  async function handleAction(
    id: number,
    action: 'pause' | 'resume' | 'cancel',
    label: string,
  ) {
    setActing(id)
    setActionError(null)
    setActionSuccess(null)

    try {
      let updated: RecurrenceTemplate
      if (action === 'pause') updated = await pauseTemplate(id)
      else if (action === 'resume') updated = await resumeTemplate(id)
      else updated = await cancelTemplate(id)

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? updated : t)),
      )
      setActionSuccess(label)
    } catch (err) {
      const apiErr = err as { message?: string }
      setActionError(apiErr.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            recurrencia
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Plantillas recurrentes
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
              onChange={(e) => setStatus(e.target.value as RecurrenceStatus | '')}
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

      {/* Feedback de acciones */}
      {(actionError ?? actionSuccess) && (
        <p
          role={actionError ? 'alert' : 'status'}
          className={[
            'rounded-md border px-3 py-2 text-sm',
            actionError
              ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
              : 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300',
          ].join(' ')}
        >
          {actionError ?? actionSuccess}
        </p>
      )}

      {/* Tabla */}
      <RutaCard>
        <RutaSectionHeader
          title={`Plantillas (${total})`}
          subtitle="lista paginada"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : templates.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No hay plantillas con los filtros seleccionados.
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
                      Periodicidad
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Próxima generación
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Estado
                    </th>
                    <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.07]">
                  {templates.map((tpl) => {
                    const isActing = acting === tpl.id
                    const isActive = tpl.status === 'RECURRENCE_ACTIVE'
                    const isPaused = tpl.status === 'RECURRENCE_PAUSED'
                    const isCancelled = tpl.status === 'RECURRENCE_CANCELLED'

                    return (
                      <tr key={tpl.id} className="hover:bg-white/[0.04]">
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                          #{tpl.id}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {tpl.buyer_name ?? `Comprador #${tpl.buyer_id}`}
                          </div>
                          {tpl.buyer_email && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {tpl.buyer_email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center rounded-md border border-sky-400/25 bg-sky-500/[0.12] px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                            {PERIODICITY_LABELS[tpl.periodicity] ?? tpl.periodicity}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(tpl.next_generation_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <RecurrenceStatusPill status={tpl.status} />
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isActive && (
                              <button
                                disabled={isActing}
                                onClick={() =>
                                  void handleAction(tpl.id, 'pause', 'Plantilla pausada.')
                                }
                                className="rounded-md border border-amber-400/30 bg-amber-500/[0.08] px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-300"
                              >
                                {isActing ? '…' : 'Pausar'}
                              </button>
                            )}
                            {isPaused && (
                              <button
                                disabled={isActing}
                                onClick={() =>
                                  void handleAction(tpl.id, 'resume', 'Plantilla reanudada.')
                                }
                                className="rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300"
                              >
                                {isActing ? '…' : 'Reanudar'}
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                disabled={isActing}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      '¿Cancelar esta plantilla recurrente? Esta acción no se puede deshacer.',
                                    )
                                  ) {
                                    void handleAction(tpl.id, 'cancel', 'Plantilla cancelada.')
                                  }
                                }}
                                className="rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-500/[0.15] disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-300"
                              >
                                {isActing ? '…' : 'Cancelar'}
                              </button>
                            )}
                            <Link
                              href={`/admin/recurrence/${tpl.id}`}
                              className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                    }
                    disabled={page <= 1}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                    }
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
