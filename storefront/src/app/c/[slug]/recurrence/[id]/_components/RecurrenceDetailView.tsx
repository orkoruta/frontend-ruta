'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  getTemplate,
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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-40 rounded-md bg-slate-200 dark:bg-slate-700" />
      <RutaCard>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-5 rounded bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </RutaCard>
    </div>
  )
}

export default function RecurrenceDetailView() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const [template, setTemplate] = useState<RecurrenceTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const numericId = Number(id)

  const loadTemplate = useCallback(async () => {
    if (!id || isNaN(numericId)) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTemplate(numericId)
      setTemplate(data)
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'AUTHENTICATION_REQUIRED') {
        router.push(`/c/${slug}/login?return=/c/${slug}/recurrence/${id}`)
        return
      }
      setError(e.message ?? 'No pudimos cargar la plantilla.')
    } finally {
      setLoading(false)
    }
  }, [id, numericId, router, slug])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  const handlePause = async () => {
    if (!template) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await pauseTemplate(template.id)
      setTemplate(updated)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo pausar la plantilla.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    if (!template) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await resumeTemplate(template.id)
      setTemplate(updated)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo reanudar la plantilla.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!template) return
    setActionLoading(true)
    setConfirmCancel(false)
    setError(null)
    try {
      await cancelTemplate(template.id)
      setTemplate((prev: RecurrenceTemplate | null) =>
        prev ? { ...prev, status: 'CANCELLED' as RecurrenceStatus } : prev,
      )
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'No se pudo cancelar la plantilla.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (error && !template) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <RutaButton variant="neutral" onClick={loadTemplate}>
            Reintentar
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  if (!template) return null

  const isCancelled = template.status === 'CANCELLED'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            recurrencia
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Detalle #{template.id}
          </h1>
        </div>
        <Link href={`/c/${slug}/recurrence`}>
          <RutaButton variant="neutral" className="justify-center">
            Mis recurrencias
          </RutaButton>
        </Link>
      </div>

      <RutaCard>
        <div className="flex items-center justify-between">
          <RutaSectionHeader title="Información" subtitle="plantilla de recurrencia" />
          <RutaPill variant={statusVariant(template.status)}>{statusLabel(template.status)}</RutaPill>
        </div>

        <dl className="mt-4 space-y-3">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Periodicidad
            </dt>
            <dd className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {periodicityLabel(template.periodicity, template.custom_interval_days)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Próxima generación
            </dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatDate(template.next_generation_at)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Última generación
            </dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatDate(template.last_generated_at)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 dark:border-white/[0.06]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pedido base
            </dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Link href={`/c/${slug}/orders/${template.order_id}`}>
                <span className="text-sky-600 hover:underline dark:text-sky-400">
                  Pedido #{template.order_id}
                </span>
              </Link>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Creada el
            </dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatDate(template.created_at)}
            </dd>
          </div>
        </dl>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200/80 bg-rose-500/[0.06] px-3 py-2 dark:border-rose-400/20">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
          </div>
        )}

        {!isCancelled && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-white/[0.06]">
            {template.status === 'ACTIVE' && (
              <RutaButton
                variant="neutral"
                disabled={actionLoading}
                onClick={handlePause}
                className="justify-center disabled:opacity-50"
              >
                {actionLoading ? 'Pausando...' : 'Pausar recurrencia'}
              </RutaButton>
            )}

            {template.status === 'PAUSED' && (
              <RutaButton
                variant="neutral"
                disabled={actionLoading}
                onClick={handleResume}
                className="justify-center disabled:opacity-50"
              >
                {actionLoading ? 'Reanudando...' : 'Reanudar recurrencia'}
              </RutaButton>
            )}

            {confirmCancel ? (
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  ¿Cancelar definitivamente?
                </p>
                <RutaButton
                  variant="danger"
                  disabled={actionLoading}
                  onClick={handleCancel}
                  className="justify-center disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelando...' : 'Sí, cancelar'}
                </RutaButton>
                <RutaButton
                  variant="neutral"
                  onClick={() => setConfirmCancel(false)}
                  className="justify-center"
                >
                  No
                </RutaButton>
              </div>
            ) : (
              <RutaButton
                variant="danger"
                disabled={actionLoading}
                onClick={() => setConfirmCancel(true)}
                className="justify-center disabled:opacity-50"
              >
                Cancelar recurrencia
              </RutaButton>
            )}
          </div>
        )}
      </RutaCard>
    </div>
  )
}
