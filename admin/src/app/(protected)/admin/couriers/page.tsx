'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPasswordInput, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  createCourier,
  getCourier,
  listCouriers,
  updateCourier,
  type ApiError,
  type Courier,
} from '@/lib/users.api'
import { PERSON_DOCUMENT_TYPES } from '@/lib/document_types'
import {
  composePhone,
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_CODES,
} from '@/lib/phone_country_codes'

const EMPTY_COURIER = {
  full_name: '',
  email: '',
  password: '',
  phone_country: DEFAULT_PHONE_COUNTRY,
  phone: '',
  document_type: 'CC',
  document_number: '',
  transport_mode: 'MOTO',
}

/**
 * El repartidor es un usuario que inicia sesión en su app, así que el correo,
 * el teléfono y la contraseña son obligatorios: sin ellos el backend rechaza la
 * creación. La contraseña la fija el administrador y se la entrega al
 * repartidor.
 */
const COURIER_FIELDS: Array<[keyof typeof EMPTY_COURIER, string, string]> = [
  ['full_name', 'Nombre completo', 'text'],
  ['email', 'Correo', 'email'],
]

function statusVariant(status?: string | null): 'green' | 'red' | 'amber' | 'slate' {
  if (status === 'ACTIVE') return 'green'
  if (status === 'SUSPENDED' || status === 'INACTIVE') return 'red'
  if (status === 'PENDING') return 'amber'
  return 'slate'
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_COURIER)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadCouriers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // El backend espera `q` y `page_size`; con `search`/`limit` los ignoraba
      // en silencio y el buscador no filtraba nada.
      const response = await listCouriers({ q: search.trim() || undefined, page: 1, page_size: 20 })
      setCouriers(response.data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cargar los repartidores.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCouriers()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadCouriers])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      await createCourier({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: composePhone(form.phone_country, form.phone),
        document_type: form.document_type,
        document_number: form.document_number.trim(),
        // `transport_mode`, no `vehicle_type`: es el nombre que valida el
        // backend y con el que se guarda en `courier_profiles`.
        transport_mode: form.transport_mode,
      })
      setForm(EMPTY_COURIER)
      setSuccess('Repartidor creado.')
      await loadCouriers()
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el repartidor.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <RutaSectionHeader title="Repartidores" subtitle="operación de entrega" />

      {error && (
        <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <RutaCard>
            <label htmlFor="courier-search" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Buscar repartidor
            </label>
            <input
              id="courier-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              placeholder="Nombre, correo, documento"
            />
          </RutaCard>

          <RutaCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80 text-sm dark:divide-white/10">
                <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Repartidor</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Vehículo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando repartidores...</td>
                    </tr>
                  )}
                  {!loading && couriers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay repartidores registrados.</td>
                    </tr>
                  )}
                  {!loading && couriers.map((courier) => (
                    <tr key={courier.id} className="hover:bg-slate-50/[0.7] dark:hover:bg-white/[0.035]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{courier.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{courier.phone ?? courier.email ?? `#${courier.id}`}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{courier.profile?.transport_mode ?? 'Sin registrar'}</td>
                      <td className="px-4 py-3">
                        <RutaPill variant={statusVariant(courier.status)}>{courier.status ?? 'SIN_ESTADO'}</RutaPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/couriers/${courier.id}`}>
                          <RutaButton type="button" size="sm" variant="secondary">Ver detalle</RutaButton>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RutaCard>
        </div>

        <RutaCard>
          <RutaSectionHeader title="Crear repartidor" subtitle="nuevo registro" />
          <form onSubmit={handleCreate} className="space-y-3">
            {COURIER_FIELDS.map(([key, label, type]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                <input
                  required
                  type={type}
                  value={form[key]}
                  onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
              </label>
            ))}
            {/* Indicativo + número: se guardan concatenados en un solo campo. */}
            <div className="grid grid-cols-[7.5rem_1fr] gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">País</span>
                <select
                  value={form.phone_country}
                  onChange={(event) => setForm((value) => ({ ...value, phone_country: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
                >
                  {PHONE_COUNTRY_CODES.map((country) => (
                    <option key={country.code} value={country.code} title={country.country}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Teléfono</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Contraseña temporal
              </span>
              <RutaPasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Entrégasela al repartidor para que entre a su app.
              </span>
            </label>

            {/* Tipo y número van juntos: son un solo dato partido en dos campos. */}
            <div className="grid grid-cols-[7.5rem_1fr] gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Tipo doc.</span>
                <select
                  value={form.document_type}
                  onChange={(event) => setForm((value) => ({ ...value, document_type: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
                >
                  {PERSON_DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value} title={type.label}>
                      {type.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Documento</span>
                <input
                  required
                  inputMode="numeric"
                  value={form.document_number}
                  onChange={(event) => setForm((value) => ({ ...value, document_number: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Vehículo</span>
              <input
                value={form.transport_mode}
                onChange={(event) => setForm((value) => ({ ...value, transport_mode: event.target.value }))}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </label>
            <RutaButton type="submit" variant="primary" disabled={creating} className="w-full justify-center">
              {creating ? 'Creando...' : 'Crear repartidor'}
            </RutaButton>
          </form>
        </RutaCard>
      </div>
    </div>
  )
}

function CourierDetailClient({ id }: { id: string }) {
  const [courier, setCourier] = useState<Courier | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    transport_mode: '',
    status: 'ACTIVE',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getCourier(id)
        if (!active) return
        setCourier(data)
        setForm({
          full_name: data.full_name,
          phone: data.phone ?? '',
          transport_mode: data.profile?.transport_mode ?? '',
          status: data.status ?? 'ACTIVE',
        })
      } catch (err) {
        const apiErr = err as ApiError
        if (active) setError(apiErr.message ?? 'No pudimos cargar el repartidor.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await updateCourier(id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        transport_mode: form.transport_mode.trim() || undefined,
        status: form.status,
      })
      setCourier(data)
      setSuccess('Repartidor actualizado.')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <RutaSectionHeader title="Detalle de repartidor" subtitle="perfil y métricas" className="mb-0" />
        <Link href="/admin/couriers">
          <RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton>
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>
      )}
      {loading && <RutaCard>Cargando repartidor...</RutaCard>}

      {!loading && courier && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <RutaCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">repartidor #{courier.id}</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{courier.full_name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{courier.email ?? 'Sin correo registrado'}</p>
              </div>
              <RutaPill variant={statusVariant(courier.status)}>{courier.status ?? 'SIN_ESTADO'}</RutaPill>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nombre completo</span>
                <input required value={form.full_name} onChange={(event) => setForm((value) => ({ ...value, full_name: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Teléfono</span>
                <input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Medio de transporte</span>
                <input value={form.transport_mode} onChange={(event) => setForm((value) => ({ ...value, transport_mode: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span>
                <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100">
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton>
              </div>
            </form>
          </RutaCard>

          <div className="space-y-5">
            <RutaCard>
              <RutaSectionHeader title="Métricas" subtitle="rendimiento" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Entregas</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.completed_deliveries ?? 0}</p></div>
                <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Tasa éxito</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.success_rate ?? 0}%</p></div>
                <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Tiempo prom.</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.average_delivery_minutes ?? 0} min</p></div>
                <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Activos</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.active_orders ?? 0}</p></div>
              </div>
            </RutaCard>
            <RutaCard>
              <RutaSectionHeader title="Historial de pedidos" subtitle="actividad" />
              {courier.orders?.length ? (
                <div className="space-y-2">
                  {courier.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-md border border-slate-200/90 p-3 text-sm dark:border-white/10">
                      <span className="font-medium text-slate-900 dark:text-slate-100">Pedido #{order.id}</span>
                      <RutaPill>{order.order_status ?? 'SIN_ESTADO'}</RutaPill>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay pedidos en el detalle recibido.</p>
              )}
            </RutaCard>
          </div>
        </div>
      )}
    </div>
  )
}
