'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  listReturns,
  type Return,
  type ReturnListFilters,
  type ReturnMechanism,
  type ReturnStatus,
} from '@/lib/returns.api'
import { ReturnStatusPill } from './_components/ReturnStatusPill'

const STATUS_OPTIONS: { value: ReturnStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'RETURN_REQUESTED', label: 'Solicitada' },
  { value: 'RETURN_UNDER_REVIEW', label: 'En revisión' },
  { value: 'RETURN_APPROVED', label: 'Aprobada' },
  { value: 'RETURN_REJECTED', label: 'Rechazada' },
  { value: 'CUSTOMER_RETURN_IN_TRANSIT', label: 'En tránsito' },
  { value: 'PICKUP_SCHEDULED', label: 'Recogida programada' },
  { value: 'PICKUP_COLLECTED', label: 'Recogida realizada' },
  { value: 'RETURN_RECEIVED', label: 'Recibida' },
  { value: 'RETURN_LOST', label: 'Perdida' },
  { value: 'RETURN_CANCELLED', label: 'Cancelada' },
]

const MECHANISM_OPTIONS: { value: ReturnMechanism | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'BUYER_SHIPS_VIA_COURIER', label: 'Comprador envía' },
  { value: 'CLIENT_PICKS_UP', label: 'Cliente recoge' },
]

const MECHANISM_LABELS: Record<ReturnMechanism, string> = {
  BUYER_SHIPS_VIA_COURIER: 'Comprador envía',
  CLIENT_PICKS_UP: 'Cliente recoge',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function ReturnsListClient() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReturnListFilters>({ page: 1, page_size: 20 })
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await listReturns(filters)
        if (!active) return
        setReturns(res.data)
        setTotal(res.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar las devoluciones.')
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

  function setStatus(status: ReturnStatus | '') {
    setFilters((f) => ({ ...f, status: status || undefined, page: 1 }))
  }

  function setMechanism(mechanism: ReturnMechanism | '') {
    setFilters((f) => ({ ...f, return_mechanism: mechanism || undefined, page: 1 }))
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            devoluciones
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            Gestión de devoluciones
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
              onChange={(e) => setStatus(e.target.value as ReturnStatus | '')}
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
              Mecanismo
            </label>
            <select
              value={filters.return_mechanism ?? ''}
              onChange={(e) => setMechanism(e.target.value as ReturnMechanism | '')}
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            >
              {MECHANISM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </RutaCard>

      {/* Tabla */}
      <RutaCard>
        <RutaSectionHeader
          title={`Devoluciones (${total})`}
          subtitle="lista paginada"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : returns.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No hay devoluciones con los filtros seleccionados.
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
                      Mecanismo
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Estado
                    </th>
                    <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Fecha solicitud
                    </th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.07]">
                  {returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-white/[0.04]">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        #{ret.id}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {ret.buyer_name ?? `Comprador #${ret.buyer_id}`}
                        </div>
                        {ret.buyer_email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {ret.buyer_email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <MechanismBadge mechanism={ret.return_mechanism} />
                      </td>
                      <td className="py-3 pr-4">
                        <ReturnStatusPill status={ret.return_status} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(ret.created_at)}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/returns/${ret.id}`}
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

function MechanismBadge({ mechanism }: { mechanism: ReturnMechanism }) {
  const isPickup = mechanism === 'CLIENT_PICKS_UP'
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        isPickup
          ? 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300'
          : 'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
      ].join(' ')}
    >
      {MECHANISM_LABELS[mechanism]}
    </span>
  )
}
