'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getRefund,
  processRefund,
  requestProviderRefund,
  type Refund,
} from '@/lib/refunds.api'
import { getOrder, type OrderStateHistoryEntry } from '@/lib/orders.api'
import { RefundStatusPill } from '../_components/RefundStatusPill'
import { MarkRefundExecutedDialog } from '../_components/MarkRefundExecutedDialog'

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const MODALITY_LABELS: Record<string, string> = {
  STORE_CREDIT: 'Crédito en tienda',
  BANK_REFUND: 'Devolución bancaria',
}

const REFUND_STATUS_LABELS: Record<string, string> = {
  REFUND_NOT_REQUIRED: 'Sin reembolso',
  REFUND_PENDING: 'Pendiente',
  REFUND_PROCESSING: 'En proceso',
  REFUND_PROVIDER_REQUESTED: 'Solicitado a proveedor',
  REFUNDED: 'Reembolsado',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  REFUND_FAILED: 'Fallido',
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  PROVIDER_REQUESTED: 'Solicitado a proveedor',
  FAILED: 'Fallido',
}

interface Props {
  refundId: number
}

export default function RefundDetailClient({ refundId }: Props) {
  const session = useContext(SessionContext)
  const [refund, setRefund] = useState<Refund | null>(null)
  const [history, setHistory] = useState<OrderStateHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !Number.isFinite(refundId) || refundId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const r = await getRefund(refundId)
        if (!active) return
        setRefund(r)

        // Cargar historia del pedido para el timeline de refund_status
        try {
          const order = await getOrder(r.order_id)
          if (!active) return
          const refundHistory = order.history.filter(
            (h) => h.dimension === 'refund_status',
          )
          setHistory(refundHistory)
        } catch {
          // El timeline es opcional — no bloquear si falla
        }
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar el reembolso.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [isAllowed, refundId])

  async function runAction(fn: () => Promise<Refund>, msg: string) {
    setActing(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await fn()
      setRefund(updated)
      setSuccess(msg)
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(false)
    }
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="reembolso" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando reembolso…</p>
      </RutaCard>
    )
  }

  if (!refund) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Reembolso no disponible" subtitle="detalle" />
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </RutaCard>
    )
  }

  const showProcess = refund.status === 'PENDING'
  const showRequestProvider =
    refund.status === 'PROCESSING' && refund.refund_modality === 'BANK_REFUND'
  const showMarkExecuted =
    refund.status === 'PROCESSING' || refund.status === 'PROVIDER_REQUESTED'

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            reembolso #{refund.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <RefundStatusPill status={refund.status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(refund.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/admin/refunds"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver a reembolsos
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
        {/* Left column — detalles + timeline */}
        <div className="flex flex-col gap-5">
          {/* Detalles */}
          <RutaCard>
            <RutaSectionHeader title="Detalle del reembolso" subtitle="información general" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Pedido
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/orders/${refund.order_id}`}
                    className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    #{refund.order_id}
                  </Link>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Modalidad
                </dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  <ModalityIndicator modality={refund.refund_modality} />
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Monto solicitado
                </dt>
                <dd className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatCOP(refund.amount)}
                </dd>
              </div>

              {refund.executed_at && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Ejecutado el
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">
                    {formatDate(refund.executed_at)}
                  </dd>
                </div>
              )}

              {refund.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Motivo
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{refund.reason}</dd>
                </div>
              )}

              {refund.external_provider_refund_id && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    ID del proveedor
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">
                    {refund.external_provider_refund_id}
                  </dd>
                </div>
              )}
            </dl>
          </RutaCard>

          {/* Timeline */}
          <RutaCard>
            <RutaSectionHeader title="Historial de estados" subtitle="timeline de reembolso" />
            {sortedHistory.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sin historial disponible.
              </p>
            ) : (
              <div className="mt-3">
                {sortedHistory.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-sky-500" />
                      {idx < sortedHistory.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {REFUND_STATUS_LABELS[entry.to_state] ?? entry.to_state}
                      </p>
                      {entry.reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.reason}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(entry.created_at)}
                        {entry.actor_role && ` · ${entry.actor_role}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RutaCard>
        </div>

        {/* Right column — acciones */}
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Acciones" subtitle="gestión del reembolso" />
            <div className="mt-3 flex flex-col gap-3">
              {showProcess && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      () => processRefund(refund.id),
                      'Reembolso en proceso.',
                    )
                  }
                >
                  {acting ? 'Procesando…' : 'Iniciar procesamiento'}
                </RutaButton>
              )}

              {showRequestProvider && (
                <RutaButton
                  type="button"
                  variant="warning"
                  disabled={acting}
                  onClick={() =>
                    void runAction(
                      () => requestProviderRefund(refund.id),
                      'Solicitud enviada al proveedor.',
                    )
                  }
                >
                  {acting ? 'Enviando…' : 'Solicitar a proveedor (Wompi)'}
                </RutaButton>
              )}

              {showMarkExecuted && !showExecuteDialog && (
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={acting}
                  onClick={() => setShowExecuteDialog(true)}
                >
                  Marcar como ejecutado
                </RutaButton>
              )}

              {showExecuteDialog && (
                <MarkRefundExecutedDialog
                  refund={refund}
                  onSuccess={(updated) => {
                    setRefund(updated)
                    setShowExecuteDialog(false)
                    setSuccess('Reembolso registrado correctamente.')
                  }}
                  onCancel={() => setShowExecuteDialog(false)}
                />
              )}

              {!showProcess && !showRequestProvider && !showMarkExecuted && !showExecuteDialog && (
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

function ModalityIndicator({ modality }: { modality: string }) {
  const isStore = modality === 'STORE_CREDIT'
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
        isStore
          ? 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300'
          : 'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
      ].join(' ')}
    >
      {MODALITY_LABELS[modality] ?? modality}
    </span>
  )
}
