'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  createPickupPoint,
  deletePickupPoint,
  getPickupPoint,
  listPickupPoints,
  updatePickupPoint,
  type ApiError,
  type PickupPoint,
} from '@/lib/users.api'

const EMPTY_PICKUP_POINT = {
  name: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  schedule: '',
}

const PICKUP_POINT_FIELDS: Array<[keyof typeof EMPTY_PICKUP_POINT, string, boolean]> = [
  ['name', 'Nombre', true],
  ['address', 'Dirección', true],
  ['city', 'Ciudad', false],
  ['state', 'Departamento', false],
  ['phone', 'Teléfono', false],
  ['schedule', 'Horario', false],
]

interface PickupPointForm {
  name: string
  address: string
  city: string
  state: string
  phone: string
  schedule: string
  latitude: string
  longitude: string
  status: string
}

const PICKUP_POINT_DETAIL_FIELDS: Array<[keyof PickupPointForm, string, boolean]> = [
  ['name', 'Nombre', true],
  ['address', 'Dirección', true],
  ['city', 'Ciudad', false],
  ['state', 'Departamento', false],
  ['phone', 'Teléfono', false],
  ['schedule', 'Horario', false],
  ['latitude', 'Latitud', false],
  ['longitude', 'Longitud', false],
]

function statusVariant(status?: string | null): 'green' | 'red' | 'slate' {
  if (status === 'ACTIVE') return 'green'
  if (status === 'INACTIVE') return 'red'
  return 'slate'
}

export default function PickupPointsPage() {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_PICKUP_POINT)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadPickupPoints = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listPickupPoints({ search, page: 1, limit: 20 })
      setPickupPoints(response.data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cargar los puntos físicos.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPickupPoints()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadPickupPoints])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      await createPickupPoint({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        phone: form.phone.trim() || null,
        schedule: form.schedule.trim() || null,
      })
      setForm(EMPTY_PICKUP_POINT)
      setSuccess('Punto físico creado.')
      await loadPickupPoints()
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el punto físico.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <RutaSectionHeader title="Puntos físicos" subtitle="recogida pickup" />

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
            <label htmlFor="pickup-search" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Buscar punto físico
            </label>
            <input
              id="pickup-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              placeholder="Nombre, dirección o ciudad"
            />
          </RutaCard>

          <RutaCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200/80 text-sm dark:divide-white/10">
                <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Punto</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Dirección</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Cargando puntos físicos...</td>
                    </tr>
                  )}
                  {!loading && pickupPoints.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No hay puntos físicos registrados.</td>
                    </tr>
                  )}
                  {!loading && pickupPoints.map((point) => (
                    <tr key={point.id} className="hover:bg-slate-50/[0.7] dark:hover:bg-white/[0.035]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{point.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{point.phone ?? `#${point.id}`}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <p>{point.address}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{point.city ?? ''} {point.state ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RutaPill variant={statusVariant(point.status)}>{point.status ?? 'SIN_ESTADO'}</RutaPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/pickup-points/${point.id}`}>
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
          <RutaSectionHeader title="Crear punto físico" subtitle="nuevo pickup" />
          <form onSubmit={handleCreate} className="space-y-3">
            {PICKUP_POINT_FIELDS.map(([key, label, required]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                <input
                  required={Boolean(required)}
                  value={form[key]}
                  onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
              </label>
            ))}
            <RutaButton type="submit" variant="primary" disabled={creating} className="w-full justify-center">
              {creating ? 'Creando...' : 'Crear punto físico'}
            </RutaButton>
          </form>
        </RutaCard>
      </div>
    </div>
  )
}

function PickupPointDetailClient({ id }: { id: string }) {
  const [point, setPoint] = useState<PickupPoint | null>(null)
  const [form, setForm] = useState<PickupPointForm>({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    schedule: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPickupPoint(id)
        if (!active) return
        setPoint(data)
        setForm({
          name: data.name,
          address: data.address,
          city: data.city ?? '',
          state: data.state ?? '',
          phone: data.phone ?? '',
          schedule: data.schedule ?? '',
          latitude: data.latitude?.toString() ?? '',
          longitude: data.longitude?.toString() ?? '',
          status: data.status ?? 'ACTIVE',
        })
      } catch (err) {
        const apiErr = err as ApiError
        if (active) setError(apiErr.message ?? 'No pudimos cargar el punto físico.')
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
      const data = await updatePickupPoint(id, {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        phone: form.phone.trim() || null,
        schedule: form.schedule.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        status: form.status,
      })
      setPoint(data)
      setSuccess('Punto físico actualizado.')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await deletePickupPoint(id)
      setSuccess('Punto físico eliminado.')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos eliminar el punto físico.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <RutaSectionHeader title="Detalle de punto físico" subtitle="pickup" className="mb-0" />
        <Link href="/admin/pickup-points">
          <RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton>
        </Link>
      </div>

      {error && <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}
      {success && <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}
      {loading && <RutaCard>Cargando punto físico...</RutaCard>}

      {!loading && point && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <RutaCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">punto #{point.id}</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{point.name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{point.address}</p>
              </div>
              <RutaPill variant={statusVariant(point.status)}>{point.status ?? 'SIN_ESTADO'}</RutaPill>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              {PICKUP_POINT_DETAIL_FIELDS.map(([key, label, required]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                  <input required={required} value={form[key]} onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span>
                <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100">
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
              <div className="flex items-end gap-3">
                <RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton>
                <RutaButton type="button" variant="danger" disabled={deleting} onClick={handleDelete}>{deleting ? 'Eliminando...' : 'Eliminar'}</RutaButton>
              </div>
            </form>
          </RutaCard>

          <RutaCard>
            <RutaSectionHeader title="Ubicación" subtitle="mapa" />
            <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-slate-200/90 bg-slate-100/[0.8] text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              {form.latitude && form.longitude ? `Pin: ${form.latitude}, ${form.longitude}` : 'Ubicación sin coordenadas registradas.'}
            </div>
          </RutaCard>
        </div>
      )}
    </div>
  )
}
