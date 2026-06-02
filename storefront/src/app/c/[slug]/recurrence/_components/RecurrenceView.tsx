'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  listMyTemplates,
  pauseTemplate,
  resumeTemplate,
  cancelTemplate,
  type RecurrenceTemplate,
  type RecurrencePeriodicity,
  type RecurrenceStatus,
} from '@/lib/recurrence.api'

function periodicityLabel(p: RecurrencePeriodicity, customDays: number | null): string {
  switch (p) {
    case 'WEEKLY':
      return 'Semanal'
    case 'BIWEEKLY':
      return 'Quincenal'
    case 'MONTHLY':
      return 'Mensual'
    case 'CUSTOM_INTERVAL':
      return customDays ? `Cada ${customDays} días` : 'Intervalo personalizado'
    default:
      return p
  }
}

function statusLabel(s: RecurrenceStatus): string {
  switch (s) {
    case 'ACTIVE':
      return 'Activa'
    case 'PAUSED':
      return 'Pausada'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return s
  }
}

type StatusVariant = 'green' | 'amber' | 'red'

function statusVariant(s: RecurrenceStatus): StatusVariant {
  switch (s) {
    case 'ACTIVE':
      return 'green'
    case 'PAUSED':
      return 'amber'
    case 'CANCELLED':
    default:
      return 'red'
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function RecurrenceSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-52 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <RutaCard key={item}>
            <div className="h-20 rounded-md bg-slate-200 dark:bg-slate-700" />
          </RutaCard>
        ))}
      </div>
    </div>
  )
}

export default function RecurrenceView() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [templates, setTemplates] = useState<RecurrenceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listMyTemplates()
      setTemplates(result.data)
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'AUTHENTICATION_REQUIRED') {
        router.push(`/c/${slug}/login?return=/c/${slug}/recurrence`)
        return
      }
      setError(e.message ?? 'No pudimos cargar tus plantillas.')
    } finally {
      setLoading(false)
    }
  }, [router, slug])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handlePause = async (id: number) => {
    setActionLoading(id)
    try {
      const updated = await pauseTemplate(id)
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo pausar la plantilla.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResume = async (id: number) => {
    setActionLoading(id)
    try {
      const updated = await resumeTemplate(id)
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo reanudar la plantilla.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: number) => {
    setActionLoading(id)
    setConfirmCancel(null)
    try {
      await cancelTemplate(id)
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'CANCELLED' as RecurrenceStatus } : t)),
      )
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo cancelar la plantilla.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <RecurrenceSkeleton />

  if (error && templates.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <RutaButton variant="neutral" onClick={loadTemplates}>
            Reintentar
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            pedidos automáticos
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Mis recurrencias
          </h1>
        </div>
        <Link href={`/c/${slug}/orders`}>
          <RutaButton variant="neutral" className="justify-center">
            Mis pedidos
          </RutaButton>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200/80 bg-rose-500/[0.06] px-3 py-2 dark:border-rose-400/20">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {templates.length === 0 ? (
        <RutaCard className="px-10 py-12 text-center">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            No tienes recurrencias activas
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Al confirmar un pedido puedes activar la repetición automática.
          </p>
          <Link href={`/c/${slug}`} className="mt-6 inline-flex">
            <RutaButton variant="primary">Ver catálogo</RutaButton>
          </Link>
        </RutaCard>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const isBusy = actionLoading === template.id
            const isCancelled = template.status === 'CANCELLED'
            return (
              <RutaCard key={template.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                        Recurrencia #{template.id}
                      </h2>
                      <RutaPill variant={statusVariant(template.status)}>
                        {statusLabel(template.status)}
                      </RutaPill>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {periodicityLabel(template.periodicity, template.custom_interval_days)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Próxima generación:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(template.next_generation_at)}
                        </span>
                      </span>
                      <span>
                        Última generación:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(template.last_generated_at)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-3">
                      <Link href={`/c/${slug}/orders/${template.order_id}`}>
                        <span className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400">
                          Ver pedido base #{template.order_id}
                        </span>
                      </Link>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/c/${slug}/recurrence/${template.id}`}>
                      <RutaButton variant="secondary" className="justify-center">
                        Ver detalle
                      </RutaButton>
                    </Link>

                    {!isCancelled && template.status === 'ACTIVE' && (
                      <RutaButton
                        variant="neutral"
                        disabled={isBusy}
                        onClick={() => handlePause(template.id)}
                        className="justify-center disabled:opacity-50"
                      >
                        {isBusy ? 'Pausando...' : 'Pausar'}
                      </RutaButton>
                    )}

                    {!isCancelled && template.status === 'PAUSED' && (
                      <RutaButton
                        variant="neutral"
                        disabled={isBusy}
                        onClick={() => handleResume(template.id)}
                        className="justify-center disabled:opacity-50"
                      >
                        {isBusy ? 'Reanudando...' : 'Reanudar'}
                      </RutaButton>
                    )}

                    {!isCancelled && (
                      <>
                        {confirmCancel === template.id ? (
                          <div className="flex gap-2">
                            <RutaButton
                              variant="danger"
                              disabled={isBusy}
                              onClick={() => handleCancel(template.id)}
                              className="justify-center disabled:opacity-50"
                            >
                              {isBusy ? 'Cancelando...' : 'Confirmar'}
                            </RutaButton>
                            <RutaButton
                              variant="neutral"
                              onClick={() => setConfirmCancel(null)}
                              className="justify-center"
                            >
                              No
                            </RutaButton>
                          </div>
                        ) : (
                          <RutaButton
                            variant="danger"
                            disabled={isBusy}
                            onClick={() => setConfirmCancel(template.id)}
                            className="justify-center disabled:opacity-50"
                          >
                            Cancelar
                          </RutaButton>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </RutaCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
