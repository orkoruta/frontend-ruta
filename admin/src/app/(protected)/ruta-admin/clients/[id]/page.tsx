'use client'

import Link from 'next/link'
import { useContext, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  activateClient,
  deactivateClient,
  getClient,
  purgeClient,
  updateClient,
  type ApiError,
  type ClientStatus,
  type ClientType,
  type FrontendMode,
  type RutaClient,
} from '@/lib/clients.api'

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeBusinessCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusPill(status: ClientStatus) {
  if (status === 'ACTIVE') return <RutaPill variant="green">Activo</RutaPill>
  return <RutaPill variant="red">Inactivo</RutaPill>
}

interface ClientDetailPageProps {
  params: { id: string }
}

export default function RutaClientDetailPage({ params }: ClientDetailPageProps) {
  const session = useContext(SessionContext)
  const router = useRouter()
  const clientId = Number(params.id)
  const [client, setClient] = useState<RutaClient | null>(null)
  const [businessCode, setBusinessCode] = useState('')
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientType, setClientType] = useState<ClientType>('FULL')
  const [frontendMode, setFrontendMode] = useState<FrontendMode>('NATIVE_RUTA')
  const [confirmDelete, setConfirmDelete] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusAction, setStatusAction] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const publicPreview = useMemo(
    () => (slug ? `/c/${slug}` : '/c/slug-del-cliente'),
    [slug],
  )

  useEffect(() => {
    let active = true

    async function loadClient() {
      setLoading(true)
      setError(null)

      try {
        const data = await getClient(clientId)

        if (!active) return
        setClient(data)
        setBusinessCode(data.business_code)
        setSlug(data.slug)
        setName(data.name)
        setDescription(data.description ?? '')
        setClientType(data.client_type)
        setFrontendMode(data.frontend_mode ?? 'NATIVE_RUTA')
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar el cliente.')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (session?.user_type === 'ADMIN_RUTA' && Number.isFinite(clientId)) {
      void loadClient()
    }

    return () => {
      active = false
    }
  }, [clientId, session?.user_type])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const cleanBusinessCode = businessCode.trim()
    const cleanSlug = normalizeSlug(slug)
    const cleanName = name.trim()

    if (!cleanBusinessCode || !cleanSlug || !cleanName) {
      setError('Identificador, slug y nombre son obligatorios.')
      return
    }

    if (clientType === 'FULL' && !frontendMode) {
      setError('Cliente Full requiere modalidad frontend.')
      return
    }

    setSaving(true)

    try {
      const updated = await updateClient(clientId, {
        business_code: cleanBusinessCode,
        slug: cleanSlug,
        name: cleanName,
        description: description.trim(),
        client_type: clientType,
        frontend_mode: clientType === 'FULL' ? frontendMode : null,
      })

      setClient(updated)
      setSlug(updated.slug)
      setSuccess('Cliente actualizado.')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos actualizar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus() {
    if (!client) return
    setStatusAction(true)
    setError(null)
    setSuccess(null)

    try {
      const updated =
        client.status === 'ACTIVE'
          ? await deactivateClient(client.id)
          : await activateClient(client.id)

      setClient(updated)
      setSuccess(
        updated.status === 'ACTIVE'
          ? 'Cliente activado.'
          : 'Cliente desactivado.',
      )
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cambiar el estado del cliente.')
    } finally {
      setStatusAction(false)
    }
  }

  async function handlePurge() {
    if (!client) return
    setError(null)
    setSuccess(null)

    if (client.status !== 'INACTIVE') {
      setError('El Cliente debe estar inactivo antes de eliminarlo.')
      return
    }

    if (confirmDelete !== client.slug && confirmDelete !== client.business_code) {
      setError('La confirmación debe coincidir con el slug o identificador.')
      return
    }

    setDeleting(true)

    try {
      await purgeClient(client.id)
      router.replace('/ruta-admin/clients')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos eliminar el cliente.')
    } finally {
      setDeleting(false)
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

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cargando cliente…
        </p>
      </RutaCard>
    )
  }

  if (!client) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Cliente no disponible" subtitle="detalle" />
        {error && (
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        )}
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            cliente #{client.id}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {client.name}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/ruta-admin/clients"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
          >
            Volver
          </Link>
          <RutaButton
            type="button"
            variant={client.status === 'ACTIVE' ? 'warning' : 'success'}
            disabled={statusAction}
            onClick={() => void toggleStatus()}
          >
            {client.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
          </RutaButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RutaCard>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            estado
          </p>
          <div className="mt-3">{statusPill(client.status)}</div>
        </RutaCard>
        <RutaCard>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            tipo
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            {client.client_type === 'FULL' ? 'Full' : 'API'}
          </p>
        </RutaCard>
        <RutaCard>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            frontend
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {client.frontend_mode === 'CUSTOM_LANDING_BY_RUTA'
              ? 'Landing personalizada'
              : client.frontend_mode === 'NATIVE_RUTA'
                ? 'Nativo RUTA'
                : 'No aplica'}
          </p>
        </RutaCard>
      </div>

      {(error || success) && (
        <p
          role={error ? 'alert' : 'status'}
          className={[
            'rounded-md border px-3 py-2 text-sm',
            error
              ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
              : 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300',
          ].join(' ')}
        >
          {error ?? success}
        </p>
      )}

      <RutaCard>
        <RutaSectionHeader title="Editar información" subtitle="datos corporativos" />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Nombre
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="businessCode"
                className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Identificador corporativo único
              </label>
              <input
                id="businessCode"
                required
                maxLength={20}
                value={businessCode}
                onChange={(e) => setBusinessCode(normalizeBusinessCode(e.target.value))}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="slug"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Slug
            </label>
            <input
              id="slug"
              required
              value={slug}
              onChange={(e) => setSlug(normalizeSlug(e.target.value))}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Vista pública: {publicPreview}
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Descripción
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Tipo de Cliente
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['FULL', 'API'] as ClientType[]).map((type) => (
                  <label
                    key={type}
                    className={[
                      'flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      clientType === type
                        ? 'border-sky-400/40 bg-sky-500/[0.12] text-sky-700 dark:border-sky-400/25 dark:text-sky-300'
                        : 'border-slate-200 bg-white/[0.06] text-slate-600 dark:border-white/10 dark:text-slate-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value={type}
                      checked={clientType === type}
                      onChange={() => setClientType(type)}
                      className="sr-only"
                    />
                    {type === 'FULL' ? 'Full' : 'API'}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset disabled={clientType === 'API'} className={clientType === 'API' ? 'opacity-55' : ''}>
              <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Modalidad frontend
              </legend>
              <div className="grid gap-2">
                {([
                  ['NATIVE_RUTA', 'Nativo RUTA'],
                  ['CUSTOM_LANDING_BY_RUTA', 'Landing personalizada'],
                ] as Array<[FrontendMode, string]>).map(([mode, label]) => (
                  <label
                    key={mode}
                    className={[
                      'flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      frontendMode === mode && clientType === 'FULL'
                        ? 'border-violet-400/40 bg-violet-500/[0.12] text-violet-700 dark:border-violet-400/25 dark:text-violet-300'
                        : 'border-slate-200 bg-white/[0.06] text-slate-600 dark:border-white/10 dark:text-slate-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="frontendMode"
                      value={mode}
                      checked={frontendMode === mode}
                      onChange={() => setFrontendMode(mode)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-3 border-t border-slate-200/90 pt-4 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400 md:grid-cols-2">
            <p>Creado: {formatDate(client.created_at)}</p>
            <p>Actualizado: {formatDate(client.updated_at)}</p>
          </div>

          <div className="flex justify-end">
            <RutaButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </RutaButton>
          </div>
        </form>
      </RutaCard>

      <RutaCard>
        <RutaSectionHeader title="Eliminar Cliente" subtitle="operación irreversible" />
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            El Cliente debe estar inactivo. Para confirmar, escribe el slug{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {client.slug}
            </span>{' '}
            o el identificador{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {client.business_code}
            </span>
            .
          </p>
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder="Confirmación"
            className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          />
          <RutaButton
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => void handlePurge()}
          >
            {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
          </RutaButton>
        </div>
      </RutaCard>
    </div>
  )
}
