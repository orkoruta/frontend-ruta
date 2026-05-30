'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  getWebhookDeliveries,
  retryDelivery,
  type ApiError,
  type WebhookDelivery,
  type WebhookDeliveryFilters,
  type WebhookDeliveryStatus,
} from '@/lib/webhooks.api'

function statusVariant(status: WebhookDeliveryStatus): 'green' | 'red' {
  return status === 'DELIVERED' ? 'green' : 'red'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function WebhooksTab() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<WebhookDeliveryFilters>({})
  const [retrying, setRetrying] = useState<Record<number, boolean>>({})
  const [retryErrors, setRetryErrors] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getWebhookDeliveries(filters)
      setDeliveries(data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cargar el historial de entregas.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRetry(deliveryId: number) {
    setRetrying((prev) => ({ ...prev, [deliveryId]: true }))
    setRetryErrors((prev) => {
      const next = { ...prev }
      delete next[deliveryId]
      return next
    })
    try {
      await retryDelivery(deliveryId)
      void load()
    } catch (err) {
      const apiErr = err as ApiError
      setRetryErrors((prev) => ({
        ...prev,
        [deliveryId]: apiErr.message ?? 'No se pudo reintentar la entrega.',
      }))
    } finally {
      setRetrying((prev) => ({ ...prev, [deliveryId]: false }))
    }
  }

  return (
    <div className="space-y-5">
      <RutaSectionHeader
        title="Historial de webhooks"
        subtitle="entregas recientes"
        className="mb-0"
      />

      {/* Filters */}
      <RutaCard>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Estado
            </span>
            <select
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as WebhookDeliveryStatus) || undefined,
                }))
              }
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-[#252930] dark:text-slate-100"
            >
              <option value="">Todos</option>
              <option value="DELIVERED">Entregado</option>
              <option value="FAILED">Fallido</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Desde
            </span>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value || undefined }))
              }
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Hasta
            </span>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value || undefined }))
              }
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </label>
        </div>
      </RutaCard>

      {error && (
        <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Deliveries table */}
      <RutaCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80 text-sm dark:divide-white/10">
            <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  URL destino
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Evento
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  HTTP
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Entregado
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando historial de webhooks...
                  </td>
                </tr>
              )}
              {!loading && deliveries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay entregas para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {!loading &&
                deliveries.map((delivery) => (
                  <Fragment key={delivery.id}>
                    <tr className="hover:bg-slate-50/[0.7] dark:hover:bg-white/[0.035]">
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        <span title={delivery.subscription_url}>{delivery.subscription_url}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {delivery.event_type}
                      </td>
                      <td className="px-4 py-3">
                        <RutaPill variant={statusVariant(delivery.status)}>
                          {delivery.status === 'DELIVERED' ? 'Entregado' : 'Fallido'}
                        </RutaPill>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {delivery.response_status ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(delivery.delivered_at ?? delivery.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {delivery.status === 'FAILED' && (
                          <RutaButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={retrying[delivery.id]}
                            onClick={() => void handleRetry(delivery.id)}
                          >
                            {retrying[delivery.id] ? 'Reintentando...' : 'Reintentar'}
                          </RutaButton>
                        )}
                      </td>
                    </tr>
                    {retryErrors[delivery.id] && (
                      <tr>
                        <td
                          colSpan={6}
                          className="bg-rose-50/[0.8] px-4 py-2 text-xs text-rose-700 dark:bg-rose-900/[0.2] dark:text-rose-300"
                        >
                          {retryErrors[delivery.id]}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </RutaCard>
    </div>
  )
}
