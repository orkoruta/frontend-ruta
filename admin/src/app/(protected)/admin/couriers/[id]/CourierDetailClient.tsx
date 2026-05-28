'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { getCourier, updateCourier, type ApiError, type Courier } from '@/lib/users.api'

export default function CourierDetailClient({ id }: { id: string }) {
  const [courier, setCourier] = useState<Courier | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', vehicle_type: '', status: 'ACTIVE' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await getCourier(id)
        if (!active) return
        setCourier(data)
        setForm({ full_name: data.full_name, phone: data.phone ?? '', vehicle_type: data.vehicle_type ?? '', status: data.status ?? 'ACTIVE' })
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
        vehicle_type: form.vehicle_type.trim() || null,
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
      <div className="flex items-end justify-between gap-3">
        <RutaSectionHeader title="Detalle de repartidor" subtitle="perfil y métricas" className="mb-0" />
        <Link href="/admin/couriers"><RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton></Link>
      </div>
      {error && <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}
      {success && <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}
      {loading && <RutaCard>Cargando repartidor...</RutaCard>}
      {!loading && courier && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <RutaCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">repartidor #{courier.id}</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{courier.full_name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{courier.email ?? 'Sin correo registrado'}</p>
              </div>
              <RutaPill variant={courier.status === 'ACTIVE' ? 'green' : 'red'}>{courier.status ?? 'SIN_ESTADO'}</RutaPill>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nombre completo</span><input required value={form.full_name} onChange={(event) => setForm((value) => ({ ...value, full_name: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Teléfono</span><input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Medio de transporte</span><input value={form.vehicle_type} onChange={(event) => setForm((value) => ({ ...value, vehicle_type: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100"><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option><option value="INACTIVE">Inactivo</option></select></label>
              <div className="md:col-span-2"><RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton></div>
            </form>
          </RutaCard>
          <RutaCard>
            <RutaSectionHeader title="Métricas" subtitle="rendimiento" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Entregas</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.completed_deliveries ?? 0}</p></div>
              <div className="rounded-md border border-slate-200/90 p-3 dark:border-white/10"><p className="text-slate-500 dark:text-slate-400">Tasa éxito</p><p className="text-lg font-bold text-slate-900 dark:text-slate-100">{courier.metrics?.success_rate ?? 0}%</p></div>
            </div>
          </RutaCard>
        </div>
      )}
    </div>
  )
}
