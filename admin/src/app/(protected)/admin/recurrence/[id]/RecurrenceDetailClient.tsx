'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  getRecurrenceTemplate,
  pauseTemplate,
  resumeTemplate,
  cancelTemplate,
  type RecurrenceTemplate,
} from '@/lib/recurrence.api'
import { RecurrenceStatusPill } from '../_components/RecurrenceStatusPill'

const PERIODICITY_LABELS: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Personalizada',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

interface Props {
  templateId: number
}

export default function RecurrenceDetailClient({ templateId }: Props) {
  const [template, setTemplate] = useState<RecurrenceTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(templateId) || templateId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getRecurrenceTemplate(templateId)
        if (!active) return
        setTemplate(data)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar la plantilla.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [templateId])

  async function runAction(
    fn: () => Promise<RecurrenceTemplate>,
    msg: string,
  ) {
    setActing(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await fn()
      setTemplate(updated)
      setSuccess(msg)
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(false)
      setConfirmCancel(false)
    }
  }

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando plantilla…</p>
      </RutaCard>
    )
  }

  if (!template) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Plantilla no disponible" subtitle="detalle" />
        {error && (
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>
        )}
      </RutaCard>
    )
  }

  const isActive = template.status === 'RECURRENCE_ACTIVE'
  const isPaused = template.status === 'RECURRENCE_PAUSED'
  const isCancelled = template.status === 'RECURRENCE_CANCELLED'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            plantilla #{template.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <RecurrenceStatusPill status={template.status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Creada el {formatDate(template.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/admin/recurrence"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver a recurrencia
        </Link>
      </div>

      {/* Feedback */}
      {(error ?? success) && (
        <p
          role={error ? 'alert' : 'status'}
          className={[
            'rounded-md border px-3 py-2 text-sm',
            error
              ? 'border-rose-400/25 bg-rose-500/[0.12] text-rose-700 dark:text-rose-300'
              : 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300',
          ].join(' ')}
        >
          {error ?? success}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-5">
          {/* Datos del comprador */}
          <RutaCard>
            <RutaSectionHeader title="Comprador" subtitle="datos del titular" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  ID
                </dt>
                <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300">
                  #{template.buyer_id}
                </dd>
              </div>

              {template.buyer_name && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Nombre
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {template.buyer_name}
                  </dd>
                </div>
              )}

              {template.buyer_email && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">
                    {template.buyer_email}
                  </dd>
                </div>
              )}
            </dl>
          </RutaCard>

          {/* Datos de recurrencia */}
          <RutaCard>
            <RutaSectionHeader title="Recurrencia" subtitle="configuración de la plantilla" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Periodicidad
                </dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center rounded-md border border-sky-400/25 bg-sky-500/[0.12] px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {PERIODICITY_LABELS[template.periodicity] ?? template.periodicity}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Estado
                </dt>
                <dd className="mt-1">
                  <RecurrenceStatusPill status={template.status} />
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Próxima generación
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {formatDate(template.next_generation_at)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Última generación
                </dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">
                  {formatDate(template.last_generated_at)}
                </dd>
              </div>
            </dl>
          </RutaCard>

          {/* Pedidos generados */}
          <RutaCard>
            <RutaSectionHeader
              title="Pedidos generados"
              subtitle="historial de pedidos de esta plantilla"
            />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              El detalle de pedidos generados estará disponible próximamente. Para ver
              pedidos asociados a este comprador, visita la sección de{' '}
              <Link
                href="/admin/orders"
                className="text-sky-600 hover:underline dark:text-sky-400"
              >
                Pedidos
              </Link>
              .
            </p>
          </RutaCard>
        </div>

        {/* Columna derecha — acciones */}
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Acciones" subtitle="gestión de la plantilla" />
            <div className="mt-3 flex flex-col gap-3">
              {isActive && (
                <RutaButton
                  type="button"
                  variant="warning"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      () => pauseTemplate(template.id),
                      'Plantilla pausada correctamente.',
                    )
                  }
                >
                  {acting ? 'Pausando…' : 'Pausar plantilla'}
                </RutaButton>
              )}

              {isPaused && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      () => resumeTemplate(template.id),
                      'Plantilla reanudada correctamente.',
                    )
                  }
                >
                  {acting ? 'Reanudando…' : 'Reanudar plantilla'}
                </RutaButton>
              )}

              {!isCancelled && !confirmCancel && (
                <RutaButton
                  type="button"
                  variant="danger"
                  disabled={acting}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancelar plantilla
                </RutaButton>
              )}

              {!isCancelled && confirmCancel && (
                <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.08] p-3">
                  <p className="mb-3 text-sm text-rose-700 dark:text-rose-300">
                    ¿Confirmas cancelar esta plantilla? Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <RutaButton
                      type="button"
                      variant="danger"
                      disabled={acting}
                      onClick={() =>
                        void runAction(
                          () => cancelTemplate(template.id),
                          'Plantilla cancelada correctamente.',
                        )
                      }
                    >
                      {acting ? 'Cancelando…' : 'Confirmar cancelación'}
                    </RutaButton>
                    <RutaButton
                      type="button"
                      variant="secondary"
                      disabled={acting}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Volver
                    </RutaButton>
                  </div>
                </div>
              )}

              {isCancelled && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Esta plantilla ha sido cancelada. No hay acciones disponibles.
                </p>
              )}
            </div>
          </RutaCard>
        </div>
      </div>
    </div>
  )
}
