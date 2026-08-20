'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { createPickupPoint, listPickupPoints, type ApiError, type PickupPoint } from '@/lib/users.api'
import { textToOpeningHours } from '@/lib/pickup_point_hours'

/** Las claves son las del contrato de la API, no las que se inventó el form. */
const EMPTY_PICKUP_POINT = {
  name: '',
  address_line: '',
  city: '',
  state: '',
  contact_phone: '',
  opening_hours: '',
}

const PICKUP_POINT_FIELDS: Array<[keyof typeof EMPTY_PICKUP_POINT, string, boolean]> = [
  ['name', 'Nombre', true],
  ['address_line', 'Dirección', true],
  ['city', 'Ciudad', false],
  ['state', 'Departamento', false],
  ['contact_phone', 'Teléfono', false],
  ['opening_hours', 'Horario', false],
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
      // `page_size`, no `limit`: el backend ignora en silencio lo que no conoce.
      const response = await listPickupPoints({ search, page: 1, page_size: 20 })
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
      // Opcionales vacíos van como `undefined`: el esquema los declara
      // `.min(1).optional()` y una cadena vacía la rechaza con 400.
      await createPickupPoint({
        name: form.name.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        opening_hours: textToOpeningHours(form.opening_hours),
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
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">{point.contact_phone ?? `#${point.id}`}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <p>{point.address_line}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{point.city ?? ''} {point.state ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RutaPill variant={statusVariant(point.status)}>{point.status === 'ACTIVE' ? 'Activo' : point.status === 'INACTIVE' ? 'Inactivo' : 'Sin estado'}</RutaPill>
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
                  placeholder={key === 'opening_hours' ? 'lunes-domingo: 12:00-22:00' : undefined}
                  value={form[key]}
                  onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
