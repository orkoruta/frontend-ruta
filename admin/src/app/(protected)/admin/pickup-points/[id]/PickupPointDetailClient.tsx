'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  activatePickupPoint,
  deactivatePickupPoint,
  getPickupPoint,
  updatePickupPoint,
  type ApiError,
  type PickupPoint,
} from '@/lib/users.api'
import { openingHoursToText, textToOpeningHours } from '@/lib/pickup_point_hours'

/** Los nombres son los del contrato; las etiquetas, las que lee el operador. */
const FIELDS = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'address_line', label: 'Dirección', required: true },
  { key: 'city', label: 'Ciudad', required: false },
  { key: 'state', label: 'Departamento', required: false },
  { key: 'contact_phone', label: 'Teléfono', required: false },
  { key: 'latitude', label: 'Latitud', required: false },
  { key: 'longitude', label: 'Longitud', required: false },
] as const

export default function PickupPointDetailClient({ id }: { id: string }) {
  const [point, setPoint] = useState<PickupPoint | null>(null)
  const [form, setForm] = useState({
    name: '',
    address_line: '',
    city: '',
    state: '',
    contact_phone: '',
    opening_hours: '',
    latitude: '',
    longitude: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await getPickupPoint(id)
        if (!active) return
        setPoint(data)
        setForm({
          name: data.name,
          address_line: data.address_line,
          city: data.city ?? '',
          state: data.state ?? '',
          contact_phone: data.contact_phone ?? '',
          opening_hours: openingHoursToText(data.opening_hours),
          latitude: data.latitude?.toString() ?? '',
          longitude: data.longitude?.toString() ?? '',
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
      /*
       * Los opcionales van como `undefined`, no `null`: el esquema los declara
       * `.min(1).optional()`, así que una cadena vacía la rechaza con 400.
       * Efecto secundario conocido: un campo ya guardado no se puede vaciar
       * desde aquí, solo sustituir.
       */
      const data = await updatePickupPoint(id, {
        name: form.name.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        opening_hours: textToOpeningHours(form.opening_hours),
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
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

  async function handleToggleStatus() {
    if (!point) return
    const willDeactivate = point.status === 'ACTIVE'
    setChangingStatus(true)
    setError(null)
    setSuccess(null)
    try {
      const data = willDeactivate ? await deactivatePickupPoint(id) : await activatePickupPoint(id)
      setPoint(data)
      setSuccess(willDeactivate ? 'Punto físico desactivado.' : 'Punto físico activado.')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cambiar el estado del punto físico.')
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <RutaSectionHeader title="Detalle de punto físico" subtitle="pickup" className="mb-0" />
        <Link href="/admin/pickup-points"><RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton></Link>
      </div>
      {error && <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}
      {success && <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}
      {loading && <RutaCard>Cargando punto físico...</RutaCard>}
      {!loading && point && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <RutaCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">punto #{point.id}</p><h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{point.name}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{point.address_line}</p></div>
              <RutaPill variant={point.status === 'ACTIVE' ? 'green' : 'red'}>{point.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</RutaPill>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.key} className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{field.label}</span><input required={field.required} value={form[field.key]} onChange={(event) => setForm((value) => ({ ...value, [field.key]: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /></label>
              ))}
              <label className="block md:col-span-2"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Horario</span><textarea rows={3} value={form.opening_hours} onChange={(event) => setForm((value) => ({ ...value, opening_hours: event.target.value }))} placeholder={'lunes-domingo: 12:00-22:00\nfestivos: cerrado'} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 font-mono text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Una franja por línea, en formato <code>días: horas</code>.</span></label>
              <div className="flex items-end gap-3 md:col-span-2"><RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton><RutaButton type="button" variant={point.status === 'ACTIVE' ? 'danger' : 'neutral'} disabled={changingStatus} onClick={handleToggleStatus}>{changingStatus ? 'Cambiando...' : point.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}</RutaButton></div>
            </form>
          </RutaCard>
          <RutaCard>
            <RutaSectionHeader title="Ubicación" subtitle="mapa" />
            <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-slate-200/90 bg-slate-100/[0.8] text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">{form.latitude && form.longitude ? `Pin: ${form.latitude}, ${form.longitude}` : 'Ubicación sin coordenadas registradas.'}</div>
          </RutaCard>
        </div>
      )}
    </div>
  )
}
