'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { deletePickupPoint, getPickupPoint, updatePickupPoint, type ApiError, type PickupPoint } from '@/lib/users.api'

const FIELDS = ['name', 'address', 'city', 'state', 'phone', 'schedule', 'latitude', 'longitude'] as const

export default function PickupPointDetailClient({ id }: { id: string }) {
  const [point, setPoint] = useState<PickupPoint | null>(null)
  const [form, setForm] = useState({
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
              <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">punto #{point.id}</p><h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{point.name}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{point.address}</p></div>
              <RutaPill variant={point.status === 'ACTIVE' ? 'green' : 'red'}>{point.status ?? 'SIN_ESTADO'}</RutaPill>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              {FIELDS.map((key) => (
                <label key={key} className="block"><span className="mb-1 block text-xs font-medium capitalize text-slate-600 dark:text-slate-400">{key.replace('_', ' ')}</span><input required={key === 'name' || key === 'address'} value={form[key]} onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /></label>
              ))}
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100"><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select></label>
              <div className="flex items-end gap-3"><RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton><RutaButton type="button" variant="danger" disabled={deleting} onClick={handleDelete}>{deleting ? 'Eliminando...' : 'Eliminar'}</RutaButton></div>
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
