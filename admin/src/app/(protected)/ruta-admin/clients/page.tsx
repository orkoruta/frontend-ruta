'use client'

import Link from 'next/link'
import { useContext, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  activateClient,
  deactivateClient,
  listClients,
  type ApiError,
  type ClientStatus,
  type ClientType,
  type RutaClient,
} from '@/lib/clients.api'

const PAGE_SIZE = 10

function statusPill(status: ClientStatus) {
  if (status === 'ACTIVE') return <RutaPill variant="green">Activo</RutaPill>
  return <RutaPill variant="red">Inactivo</RutaPill>
}

function clientTypeLabel(clientType: ClientType) {
  return clientType === 'FULL' ? 'Full' : 'API'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value))
}

export default function RutaAdminClientsPage() {
  const session = useContext(SessionContext)
  const [clients, setClients] = useState<RutaClient[]>([])
  const [q, setQ] = useState('')
  const [draftQ, setDraftQ] = useState('')
  const [clientType, setClientType] = useState<ClientType | ''>('')
  const [status, setStatus] = useState<ClientStatus | ''>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  useEffect(() => {
    let active = true

    async function loadClients() {
      setLoading(true)
      setError(null)

      try {
        const data = await listClients({
          q: q || undefined,
          client_type: clientType || undefined,
          status: status || undefined,
          page,
          page_size: PAGE_SIZE,
        })

        if (!active) return
        setClients(data.items)
        setTotal(data.pagination.total)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar los clientes.')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (session?.user_type === 'ADMIN_RUTA') {
      void loadClients()
    }

    return () => {
      active = false
    }
  }, [clientType, page, q, session?.user_type, status])

  function applySearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    setQ(draftQ.trim())
  }

  function resetFilters() {
    setDraftQ('')
    setQ('')
    setClientType('')
    setStatus('')
    setPage(1)
  }

  async function toggleStatus(client: RutaClient) {
    setActionId(client.id)
    setError(null)

    try {
      const updated =
        client.status === 'ACTIVE'
          ? await deactivateClient(client.id)
          : await activateClient(client.id)

      setClients((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cambiar el estado del cliente.')
    } finally {
      setActionId(null)
    }
  }

  if (session?.user_type !== 'ADMIN_RUTA') {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="clientes" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Esta pantalla está disponible solo para ADMIN_RUTA.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            gestión global
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Clientes
          </h1>
        </div>

        <Link
          href="/ruta-admin/clients/new"
          className="inline-flex items-center justify-center rounded-md border border-sky-400/40 bg-sky-500/[0.12] px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-500/[0.2] dark:border-sky-400/25 dark:text-sky-300"
        >
          Crear Cliente
        </Link>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Filtros" subtitle="búsqueda" />
        <form onSubmit={applySearch} className="grid gap-3 lg:grid-cols-[1fr_160px_160px_auto]">
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Nombre, slug o identificador"
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          />

          <select
            value={clientType}
            onChange={(e) => {
              setClientType(e.target.value as ClientType | '')
              setPage(1)
            }}
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
          >
            <option value="">Todos los tipos</option>
            <option value="API">API</option>
            <option value="FULL">Full</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ClientStatus | '')
              setPage(1)
            }}
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>

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
          <RutaSectionHeader title="Lista de Clientes" subtitle={`${total} registros`} className="mb-0" />
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Cargando clientes…
          </div>
        ) : clients.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No hay clientes para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
              <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creación</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                {clients.map((client) => (
                  <tr key={client.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {client.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {client.business_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">{client.slug}</td>
                    <td className="px-4 py-3">{clientTypeLabel(client.client_type)}</td>
                    <td className="px-4 py-3">{statusPill(client.status)}</td>
                    <td className="px-4 py-3">{formatDate(client.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/ruta-admin/clients/${client.id}`}
                          className="inline-flex items-center rounded-md border border-violet-400/40 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-500/[0.2] dark:border-violet-400/25 dark:text-violet-300"
                        >
                          Ver
                        </Link>
                        <RutaButton
                          type="button"
                          size="sm"
                          variant={client.status === 'ACTIVE' ? 'warning' : 'success'}
                          disabled={actionId === client.id}
                          onClick={() => void toggleStatus(client)}
                        >
                          {client.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </RutaButton>
                      </div>
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </RutaButton>
            <RutaButton
              type="button"
              size="sm"
              variant="neutral"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </RutaButton>
          </div>
        </div>
      </RutaCard>
    </div>
  )
}
