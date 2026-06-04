'use client'

import Link from 'next/link'
import { useContext, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  createClient,
  type ApiError,
  type ClientType,
  type FrontendMode,
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

export default function NewRutaClientPage() {
  const session = useContext(SessionContext)
  const router = useRouter()
  const [businessCode, setBusinessCode] = useState('')
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientType, setClientType] = useState<ClientType>('FULL')
  const [frontendMode, setFrontendMode] = useState<FrontendMode>('NATIVE_RUTA')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicPreview = useMemo(
    () => (slug ? `/c/${slug}` : '/c/slug-del-cliente'),
    [slug],
  )

  function fillFromName() {
    if (!slug) setSlug(normalizeSlug(name))
    if (!businessCode) setBusinessCode(normalizeBusinessCode(name).slice(0, 20))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

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

    setLoading(true)

    try {
      const client = await createClient({
        business_code: cleanBusinessCode,
        slug: cleanSlug,
        name: cleanName,
        description: description.trim() || undefined,
        client_type: clientType,
        frontend_mode: clientType === 'FULL' ? frontendMode : undefined,
      })

      router.replace(`/ruta-admin/clients/${client.id}`)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el cliente.')
    } finally {
      setLoading(false)
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            gestión global
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Crear Cliente
          </h1>
        </div>

        <Link
          href="/ruta-admin/clients"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver
        </Link>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Datos corporativos" subtitle="cliente" />

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
                onBlur={fillFromName}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                placeholder="CLI-001"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
              placeholder="restaurante-el-prado"
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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

            {clientType === 'FULL' && (
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Modalidad frontend <span className="text-rose-500">*</span>
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
                        frontendMode === mode
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
            )}
            {clientType === 'API' && (
              <div className="flex items-center rounded-md border border-sky-400/25 bg-sky-500/[0.08] px-3 py-3">
                <p className="text-xs text-sky-700 dark:text-sky-300">
                  Los clientes de tipo API no utilizan frontend propio. RUTA provee solo
                  la capa logística vía API.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200/90 pt-4 dark:border-white/10 sm:flex-row sm:justify-end">
            <Link
              href="/ruta-admin/clients"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
            >
              Cancelar
            </Link>
            <RutaButton
              type="submit"
              variant="primary"
              disabled={loading}
              className="justify-center"
            >
              {loading ? 'Creando…' : 'Crear Cliente'}
            </RutaButton>
          </div>
        </form>
      </RutaCard>
    </div>
  )
}
