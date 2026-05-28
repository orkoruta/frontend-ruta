'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { getBuyer, listBuyers, updateBuyer, type ApiError, type Buyer } from '@/lib/users.api'

function statusVariant(status?: string | null): 'green' | 'red' | 'amber' | 'slate' {
  if (status === 'ACTIVE') return 'green'
  if (status === 'SUSPENDED' || status === 'INACTIVE') return 'red'
  if (status === 'PENDING') return 'amber'
  return 'slate'
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await listBuyers({ search, page: 1, limit: 20 })
        if (active) setBuyers(response.data)
      } catch (err) {
        const apiErr = err as ApiError
        if (active) setError(apiErr.message ?? 'No pudimos cargar los compradores.')
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = window.setTimeout(load, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  const totalLabel = useMemo(() => {
    if (loading) return 'Cargando'
    return `${buyers.length} comprador${buyers.length === 1 ? '' : 'es'}`
  }, [buyers.length, loading])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <RutaSectionHeader
          title="Compradores"
          subtitle="gestión de usuarios"
          className="mb-0"
        />
        <span className="text-sm text-slate-500 dark:text-slate-400">{totalLabel}</span>
      </div>

      <RutaCard>
        <label
          htmlFor="buyer-search"
          className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          Buscar por nombre, correo o documento
        </label>
        <input
          id="buyer-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          placeholder="Ej. comprador@empresa.com"
        />
      </RutaCard>

      {error && (
        <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <RutaCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80 text-sm dark:divide-white/10">
            <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Comprador</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Contacto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Cargando compradores...
                  </td>
                </tr>
              )}
              {!loading && buyers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No hay compradores para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {!loading &&
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-slate-50/[0.7] dark:hover:bg-white/[0.035]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{buyer.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">#{buyer.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <p>{buyer.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{buyer.phone ?? 'Sin teléfono'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {buyer.document_type ?? 'Doc.'} {buyer.document_number ?? 'sin registrar'}
                    </td>
                    <td className="px-4 py-3">
                      <RutaPill variant={statusVariant(buyer.status)}>{buyer.status ?? 'SIN_ESTADO'}</RutaPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/buyers/${buyer.id}`}>
                        <RutaButton type="button" size="sm" variant="secondary">
                          Ver detalle
                        </RutaButton>
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </RutaCard>
    </div>
  )
}

function BuyerDetailClient({ id }: { id: string }) {
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
      setError(null)
      try {
        const data = await getBuyer(id)
        if (!active) return
        setBuyer(data)
        setForm({
          full_name: data.full_name,
          phone: data.phone ?? '',
          status: data.status ?? 'ACTIVE',
        })
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <RutaSectionHeader title="Detalle de comprador" subtitle="perfil y actividad" className="mb-0" />
        <Link href="/admin/buyers">
          <RutaButton type="button" variant="neutral" size="sm">Volver</RutaButton>
        </Link>
      </div>

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
              <RutaPill variant={statusVariant(buyer.status)}>{buyer.status ?? 'SIN_ESTADO'}</RutaPill>
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
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Estado</span>
                <select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))} className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#252930] dark:text-slate-100">
                  <option value="ACTIVE">Activo</option>
                  <option value="SUSPENDED">Suspendido</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
              <div className="flex items-end">
                <RutaButton type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</RutaButton>
              </div>
            </form>
          </RutaCard>

          <div className="space-y-5">
            <RutaCard>
              <RutaSectionHeader title="Documento" subtitle="identificación" />
              <p className="text-sm text-slate-700 dark:text-slate-300">{buyer.document_type ?? 'Tipo no registrado'} {buyer.document_number ?? ''}</p>
            </RutaCard>
            <RutaCard>
              <RutaSectionHeader title="Direcciones" subtitle="comprador" />
              {buyer.addresses?.length ? (
                <div className="space-y-3">
                  {buyer.addresses.map((address, index) => (
                    <div key={address.id ?? index} className="rounded-md border border-slate-200/90 p-3 text-sm dark:border-white/10">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{address.line ?? 'Dirección sin línea'}</p>
                      <p className="text-slate-500 dark:text-slate-400">{address.city ?? 'Ciudad no registrada'} {address.state ?? ''}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No hay direcciones registradas.</p>
              )}
            </RutaCard>
            <RutaCard>
              <RutaSectionHeader title="Historial de pedidos" subtitle="actividad" />
              {buyer.orders?.length ? (
                <div className="space-y-2">
                  {buyer.orders.map((order) => (
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
