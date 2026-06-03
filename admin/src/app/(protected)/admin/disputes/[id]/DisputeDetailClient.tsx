'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getDispute,
  resolveDispute,
  startDisputeReview,
  type Dispute,
  type DisputeAction,
} from '@/lib/disputes.api'
import { DisputeStatusPill } from '../_components/DisputeStatusPill'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

const ACTION_LABELS: Record<DisputeAction, string> = {
  NO_ACTION: 'Sin acción',
  WITH_RETURN: 'Con devolución',
  WITH_REFUND: 'Con reembolso',
}

interface ResolveDialogProps {
  dispute: Dispute
  onSuccess: (updated: Dispute) => void
  onCancel: () => void
}

function ResolveDialog({ dispute, onSuccess, onCancel }: ResolveDialogProps) {
  const [action, setAction] = useState<DisputeAction>('NO_ACTION')
  const [resolution, setResolution] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolution.trim()) {
      setError('El campo "Resolución" es obligatorio.')
      return
    }
    if (action === 'WITH_REFUND' && (!amount || Number(amount) <= 0)) {
      setError('Ingresa un monto válido para el reembolso.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const updated = await resolveDispute(dispute.id, {
        action,
        resolution: resolution.trim(),
        ...(action === 'WITH_REFUND' ? { amount: Number(amount) } : {}),
      })
      onSuccess(updated)
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos resolver la disputa.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/[0.04] p-4 dark:border-white/10">
      <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Resolver disputa #{dispute.id}
      </p>

      {error && (
        <p role="alert" className="mb-3 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        {/* Selector de acción */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Acción
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as DisputeAction)}
            className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          >
            <option value="NO_ACTION">{ACTION_LABELS.NO_ACTION}</option>
            <option value="WITH_RETURN">{ACTION_LABELS.WITH_RETURN}</option>
            <option value="WITH_REFUND">{ACTION_LABELS.WITH_REFUND}</option>
          </select>
        </div>

        {/* Monto (solo para WITH_REFUND) */}
        {action === 'WITH_REFUND' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Monto (COP)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>
        )}

        {/* Resolución */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Resolución
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
            placeholder="Describe la resolución de la disputa…"
            className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          />
        </div>

        <div className="flex gap-2">
          <RutaButton type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Confirmando…' : 'Confirmar'}
          </RutaButton>
          <RutaButton type="button" variant="secondary" disabled={submitting} onClick={onCancel}>
            Cancelar
          </RutaButton>
        </div>
      </form>
    </div>
  )
}

interface Props {
  disputeId: number
}

export default function DisputeDetailClient({ disputeId }: Props) {
  const session = useContext(SessionContext)
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showResolveDialog, setShowResolveDialog] = useState(false)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !Number.isFinite(disputeId) || disputeId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const d = await getDispute(disputeId)
        if (!active) return
        setDispute(d)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar la disputa.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [isAllowed, disputeId])

  async function handleStartReview() {
    if (!dispute) return
    setActing(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await startDisputeReview(dispute.id)
      setDispute(updated)
      setSuccess('Revisión iniciada correctamente.')
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos iniciar la revisión.')
    } finally {
      setActing(false)
    }
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="disputa" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando disputa…</p>
      </RutaCard>
    )
  }

  if (!dispute) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Disputa no disponible" subtitle="detalle" />
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </RutaCard>
    )
  }

  const canStartReview = dispute.status === 'DISPUTED'
  const canResolve = dispute.status === 'DISPUTE_UNDER_REVIEW'
  const isResolved =
    dispute.status === 'DISPUTE_RESOLVED_NO_ACTION' ||
    dispute.status === 'DISPUTE_RESOLVED_WITH_RETURN' ||
    dispute.status === 'DISPUTE_RESOLVED_WITH_REFUND'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            disputa #{dispute.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DisputeStatusPill status={dispute.status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(dispute.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/admin/disputes"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver a disputas
        </Link>
      </div>

      {(error || success) && (
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
        {/* Left column — detalles */}
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Detalle de la disputa" subtitle="información general" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Pedido
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/orders/${dispute.order_id}`}
                    className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    #{dispute.order_id}
                  </Link>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Comprador
                </dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {dispute.buyer_name ?? `Comprador #${dispute.buyer_id}`}
                </dd>
                {dispute.buyer_email && (
                  <dd className="text-xs text-slate-500 dark:text-slate-400">
                    {dispute.buyer_email}
                  </dd>
                )}
              </div>

              {dispute.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Razón
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{dispute.reason}</dd>
                </div>
              )}

              {isResolved && dispute.resolved_action && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Acción tomada
                  </dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {ACTION_LABELS[dispute.resolved_action]}
                  </dd>
                </div>
              )}

              {isResolved && dispute.refund_amount != null && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Monto reembolsado
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                    {formatCOP(dispute.refund_amount)}
                  </dd>
                </div>
              )}

              {isResolved && dispute.resolution && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Resolución
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{dispute.resolution}</dd>
                </div>
              )}
            </dl>
          </RutaCard>
        </div>

        {/* Right column — acciones */}
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Acciones" subtitle="gestión de la disputa" />
            <div className="mt-3 flex flex-col gap-3">
              {canStartReview && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() => void handleStartReview()}
                >
                  {acting ? 'Iniciando…' : 'Iniciar revisión'}
                </RutaButton>
              )}

              {canResolve && !showResolveDialog && (
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={acting}
                  onClick={() => setShowResolveDialog(true)}
                >
                  Resolver disputa
                </RutaButton>
              )}

              {canResolve && showResolveDialog && (
                <ResolveDialog
                  dispute={dispute}
                  onSuccess={(updated) => {
                    setDispute(updated)
                    setShowResolveDialog(false)
                    setSuccess('Disputa resuelta correctamente.')
                  }}
                  onCancel={() => setShowResolveDialog(false)}
                />
              )}

              {!canStartReview && !canResolve && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay acciones disponibles para el estado actual.
                </p>
              )}
            </div>
          </RutaCard>
        </div>
      </div>
    </div>
  )
}
