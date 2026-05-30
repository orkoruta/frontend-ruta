'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getAuditEvents,
  getRutaAdminAuditEvents,
  type ApiError,
  type AuditEvent,
  type AuditFilters,
} from '@/lib/audit.api'

const PAGE_SIZE = 25

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

const INPUT_CLASS =
  'rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

export default function AuditPage() {
  const session = useContext(SessionContext)

  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [entityType, setEntityType] = useState('')
  const [userIdInput, setUserIdInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Applied filters (committed on search)
  const [appliedEntityType, setAppliedEntityType] = useState('')
  const [appliedUserId, setAppliedUserId] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')

  const isRutaAdmin = session?.user_type === 'ADMIN_RUTA'

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT'

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])

  useEffect(() => {
    if (!isAllowed) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const filters: AuditFilters = {
        page,
        page_size: PAGE_SIZE,
        entity_type: appliedEntityType || undefined,
        user_id: appliedUserId ? Number(appliedUserId) : undefined,
        from: appliedDateFrom || undefined,
        to: appliedDateTo || undefined,
      }

      try {
        const fn = isRutaAdmin ? getRutaAdminAuditEvents : getAuditEvents
        const data = await fn(filters)
        if (!active) return
        setEvents(data.items)
        setTotal(data.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar los eventos de auditoría.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [isAllowed, isRutaAdmin, page, appliedEntityType, appliedUserId, appliedDateFrom, appliedDateTo])

  function applyFilters() {
    setPage(1)
    setAppliedEntityType(entityType.trim())
    setAppliedUserId(userIdInput.trim())
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
  }

  function resetFilters() {
    setEntityType('')
    setUserIdInput('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    setAppliedEntityType('')
    setAppliedUserId('')
    setAppliedDateFrom('')
    setAppliedDateTo('')
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="auditoría" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {isRutaAdmin ? 'ruta admin' : 'administración'}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Auditoría
        </h1>
      </div>

      {/* Filters */}
      <RutaCard>
        <RutaSectionHeader title="Filtros" subtitle="búsqueda" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="Tipo de entidad (ej. order)"
            className={INPUT_CLASS}
          />

          <input
            type="number"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="ID de usuario"
            min={1}
            className={INPUT_CLASS}
          />

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={INPUT_CLASS}
            aria-label="Desde"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={INPUT_CLASS}
            aria-label="Hasta"
          />

          <div className="flex gap-2">
            <RutaButton type="button" variant="primary" onClick={applyFilters} className="justify-center">
              Filtrar
            </RutaButton>
            <RutaButton type="button" variant="neutral" onClick={resetFilters}>
              Limpiar
            </RutaButton>
          </div>
        </div>
      </RutaCard>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {/* Table */}
      <RutaCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader
            title="Eventos de auditoría"
            subtitle={loading ? 'cargando…' : `${total} registros`}
            className="mb-0"
          />
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Cargando eventos…
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No hay eventos para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
              <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo de evento</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">ID entidad</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Descripción</th>
                  {isRutaAdmin && <th className="px-4 py-3">Cliente</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="text-slate-700 hover:bg-slate-50/[0.5] dark:text-slate-300 dark:hover:bg-white/[0.025]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(event.occurred_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {event.event_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {event.entity_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {event.entity_id ?? <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      {event.user_email ? (
                        <span title={`ID: ${event.user_id ?? '—'}`}>{event.user_email}</span>
                      ) : event.user_id ? (
                        <span className="font-mono">#{event.user_id}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">Sistema</span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="line-clamp-2">
                        {event.description ?? <span className="text-slate-400 dark:text-slate-600">—</span>}
                      </span>
                    </td>
                    {isRutaAdmin && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        #{event.client_id}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
