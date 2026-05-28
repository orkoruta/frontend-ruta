'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { getBuyer, updateBuyer, type ApiError, type Buyer } from '@/lib/users.api'

export default function BuyerDetailClient({ id }: { id: string }) {
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', status: 'ACTIVE' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await getBuyer(id)
        if (!active) return
        setBuyer(data)
        setForm({ full_name: data.full_name, phone: data.phone ?? '', status: data.status ?? 'ACTIVE' })
      } catch (err) {
        const apiErr = err as ApiError
        if (active) setError(apiErr.message ?? 'No pudimos cargar el comprador.')
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
      const data = await updateBuyer(id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
      })
      setBuyer(data)
      setSuccess('Comprador actualizado.')
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
        <RutaSectionHeader title="Detalle de comprador" subtitle="perfil y actividad" className="mb-0" />
        <Link href="/admin/buyers"><RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton></Link>
      </div>
      {error && <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>}
      {success && <div className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div>}
      {loading && <RutaCard>Cargando comprador...</RutaCard>}
      {!loading && buyer && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <RutaCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">comprador #{buyer.id}</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{buyer.full_name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{buyer.email}</p>
              </div>
              <RutaPill variant={buyer.status === 'ACTIVE' ? 'green' : 'red'}>{buyer.status ?? 'SIN_ESTADO'}</RutaPill>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Nombre completo</span>
                <input required value={form.full_name} onChange={(event) => setForm((value) => ({ ...value, full_name: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Teléfono</span>
                <input value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span>
                <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100">
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
              <div className="flex items-end"><RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton></div>
            </form>
          </RutaCard>
          <div className="space-y-5">
            <RutaCard>
              <RutaSectionHeader title="Direcciones" subtitle="comprador" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{buyer.addresses?.length ? `${buyer.addresses.length} direcciones registradas` : 'No hay direcciones registradas.'}</p>
            </RutaCard>
            <RutaCard>
              <RutaSectionHeader title="Historial de pedidos" subtitle="actividad" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{buyer.orders?.length ? `${buyer.orders.length} pedidos en el detalle` : 'No hay pedidos en el detalle recibido.'}</p>
            </RutaCard>
          </div>
        </div>
      )}
    </div>
  )
}
