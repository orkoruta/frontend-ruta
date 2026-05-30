'use client'

import { useContext, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import { SESSION_KEY } from '@/lib/session'
import { listClients, type RutaClient } from '@/lib/clients.api'
import { enterControlView, exitControlView } from '@/lib/control_view.api'

export default function ControlViewPage() {
  const session = useContext(SessionContext)
  const router = useRouter()

  const [clients, setClients] = useState<RutaClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  const [selectedClientId, setSelectedClientId] = useState<number | ''>('')
  const [masterPassword, setMasterPassword] = useState('')
  const [reason, setReason] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadClients() {
      setLoadingClients(true)
      setClientsError(null)
      try {
        const data = await listClients({ status: 'ACTIVE', page_size: 200 })
        if (!active) return
        setClients(data.items)
      } catch {
        if (!active) return
        setClientsError('No pudimos cargar la lista de clientes.')
      } finally {
        if (active) setLoadingClients(false)
      }
    }

    if (session?.user_type === 'ADMIN_RUTA') {
      void loadClients()
    }

    return () => {
      active = false
    }
  }, [session?.user_type])

  async function handleEnter(e: FormEvent) {
    e.preventDefault()
    if (selectedClientId === '' || !masterPassword) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await enterControlView(
        selectedClientId,
        masterPassword,
        reason.trim() || undefined,
      )

      const current = sessionStorage.getItem(SESSION_KEY)
      const base = current ? JSON.parse(current) : {}
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...base,
          client_id: result.target_client.id,
          acting_via_control_view: true,
          impersonating: true,
          target_client_id: result.target_client.id,
          target_client_name: result.target_client.name,
        }),
      )

      router.replace('/admin/orders')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al entrar a Vista de Control.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExit() {
    setExitError(null)
    try {
      await exitControlView()
    } catch {
      // Best-effort: clear session regardless
    } finally {
      sessionStorage.removeItem(SESSION_KEY)
      router.replace('/ruta-admin/clients')
    }
  }

  if (session?.user_type !== 'ADMIN_RUTA') {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="vista de control" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Esta pantalla está disponible solo para ADMIN_RUTA.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          gestión global
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Vista de Control
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ingresa al espacio de un Cliente como ADMIN_RUTA. Todas tus acciones quedan auditadas.
        </p>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Entrar a Vista de Control" subtitle="impersonación auditada" />

        {clientsError && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {clientsError}
          </p>
        )}

        <form onSubmit={(e) => void handleEnter(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="client-select"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Cliente
            </label>
            {loadingClients ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando clientes…</p>
            ) : (
              <select
                id="client-select"
                required
                value={selectedClientId}
                onChange={(e) =>
                  setSelectedClientId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
              >
                <option value="">Selecciona un cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="master-password"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Contraseña maestra
            </label>
            <input
              id="master-password"
              type="password"
              required
              autoComplete="current-password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Contraseña maestra de Vista de Control"
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reason"
              className="text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Razón de soporte{' '}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Soporte ticket #1234 — revisar pedido bloqueado"
              className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <RutaButton
              type="submit"
              variant="primary"
              disabled={submitting || loadingClients || selectedClientId === '' || !masterPassword}
            >
              {submitting ? 'Entrando…' : 'Entrar a Vista de Control'}
            </RutaButton>
          </div>
        </form>
      </RutaCard>

      <RutaCard>
        <RutaSectionHeader title="Salir de Vista de Control" subtitle="cerrar sesión impersonada" />
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Si ya estás en una Vista de Control activa, puedes salir aquí para volver a tu sesión
          normal de ADMIN_RUTA.
        </p>

        {exitError && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {exitError}
          </p>
        )}

        <RutaButton
          type="button"
          variant="warning"
          onClick={() => void handleExit()}
        >
          Salir de Vista de Control
        </RutaButton>
      </RutaCard>
    </div>
  )
}
