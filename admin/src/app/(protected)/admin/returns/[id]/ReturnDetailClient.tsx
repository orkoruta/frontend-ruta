'use client'

import Link from 'next/link'
import { useContext, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import {
  getReturn,
  startReview,
  approveReturn,
  rejectReturn,
  schedulePickup,
  markReceived,
  markLost,
  cancelReturn,
  type Return,
} from '@/lib/returns.api'
import { listCouriers, type Courier } from '@/lib/users.api'
import { ReturnStatusPill, RETURN_STATUS_LABELS } from '../_components/ReturnStatusPill'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const MECHANISM_LABELS: Record<string, string> = {
  BUYER_SHIPS_VIA_COURIER: 'Comprador envía por mensajero',
  CLIENT_PICKS_UP: 'Cliente recoge',
}

interface Props {
  returnId: number
}

export default function ReturnDetailClient({ returnId }: Props) {
  const session = useContext(SessionContext)
  const [ret, setRet] = useState<Return | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reject dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Schedule pickup state
  const [showPickupForm, setShowPickupForm] = useState(false)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null)
  const [loadingCouriers, setLoadingCouriers] = useState(false)

  // Cancel confirm
  const [confirmCancel, setConfirmCancel] = useState(false)

  const isAllowed =
    session?.user_type === 'ADMIN_RUTA' ||
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'OPERATOR_CLIENT'

  useEffect(() => {
    if (!isAllowed || !Number.isFinite(returnId) || returnId <= 0) return

    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getReturn(returnId)
        if (!active) return
        setRet(data)
      } catch (err) {
        if (!active) return
        const apiErr = err as { message?: string }
        setError(apiErr.message ?? 'No pudimos cargar la devolución.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [isAllowed, returnId])

  async function runAction(fn: () => Promise<Return>, msg: string) {
    setActing(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await fn()
      setRet(updated)
      setSuccess(msg)
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos completar la acción.')
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!ret || !rejectReason.trim()) return
    await runAction(() => rejectReturn(ret.id, rejectReason.trim()), 'Devolución rechazada.')
    setShowRejectDialog(false)
    setRejectReason('')
  }

  async function handleSchedulePickup() {
    if (!ret || !selectedCourierId) return
    await runAction(
      () => schedulePickup(ret.id, selectedCourierId),
      'Recogida programada correctamente.',
    )
    setShowPickupForm(false)
    setSelectedCourierId(null)
  }

  async function openPickupForm() {
    setShowPickupForm(true)
    setLoadingCouriers(true)
    try {
      const res = await listCouriers({ limit: 50 })
      setCouriers(res.data)
    } catch {
      setCouriers([])
    } finally {
      setLoadingCouriers(false)
    }
  }

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="devolución" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  if (loading) {
    return (
      <RutaCard>
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando devolución…</p>
      </RutaCard>
    )
  }

  if (!ret) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Devolución no disponible" subtitle="detalle" />
        {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </RutaCard>
    )
  }

  const isRequested = ret.return_status === 'RETURN_REQUESTED'
  const isUnderReview = ret.return_status === 'RETURN_UNDER_REVIEW'
  const isApproved = ret.return_status === 'RETURN_APPROVED'
  const isInTransit = ret.return_status === 'CUSTOMER_RETURN_IN_TRANSIT'
  const isPickupCollected = ret.return_status === 'PICKUP_COLLECTED'
  const isTerminal =
    ret.return_status === 'RETURN_RECEIVED' ||
    ret.return_status === 'RETURN_LOST' ||
    ret.return_status === 'RETURN_REJECTED' ||
    ret.return_status === 'RETURN_CANCELLED'

  const canMarkReceived = isInTransit || isPickupCollected
  const canCancel = !isTerminal && !confirmCancel

  // Timeline steps for display
  const TIMELINE_STEPS: Array<{ status: string; label: string }> = [
    { status: 'RETURN_REQUESTED', label: 'Solicitada' },
    { status: 'RETURN_UNDER_REVIEW', label: 'En revisión' },
    { status: 'RETURN_APPROVED', label: 'Aprobada' },
    ret.return_mechanism === 'CLIENT_PICKS_UP'
      ? { status: 'PICKUP_SCHEDULED', label: 'Recogida programada' }
      : { status: 'CUSTOMER_RETURN_IN_TRANSIT', label: 'En tránsito' },
    ret.return_mechanism === 'CLIENT_PICKS_UP'
      ? { status: 'PICKUP_COLLECTED', label: 'Recogida realizada' }
      : { status: 'RETURN_RECEIVED', label: 'Recibida' },
    { status: 'RETURN_RECEIVED', label: 'Recibida' },
  ]

  const ORDERED_STATUSES = [
    'RETURN_REQUESTED',
    'RETURN_UNDER_REVIEW',
    'RETURN_APPROVED',
    'PICKUP_SCHEDULED',
    'CUSTOMER_RETURN_IN_TRANSIT',
    'PICKUP_COLLECTED',
    'RETURN_RECEIVED',
    'RETURN_LOST',
    'RETURN_REJECTED',
    'RETURN_CANCELLED',
  ]

  const currentIndex = ORDERED_STATUSES.indexOf(ret.return_status)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            devolución #{ret.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ReturnStatusPill status={ret.return_status} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(ret.created_at)}
            </span>
          </div>
        </div>
        <Link
          href="/admin/returns"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Volver a devoluciones
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
          {/* Datos generales */}
          <RutaCard>
            <RutaSectionHeader title="Detalle de la devolución" subtitle="información general" />
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Pedido
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/orders/${ret.order_id}`}
                    className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    #{ret.order_id}
                  </Link>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Comprador
                </dt>
                <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {ret.buyer_name ?? `#${ret.buyer_id}`}
                  {ret.buyer_email && (
                    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                      {ret.buyer_email}
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Mecanismo
                </dt>
                <dd className="mt-1">
                  <span
                    className={[
                      'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
                      ret.return_mechanism === 'CLIENT_PICKS_UP'
                        ? 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300'
                        : 'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
                    ].join(' ')}
                  >
                    {MECHANISM_LABELS[ret.return_mechanism] ?? ret.return_mechanism}
                  </span>
                </dd>
              </div>

              {ret.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Motivo del comprador
                  </dt>
                  <dd className="mt-1 text-slate-700 dark:text-slate-300">{ret.reason}</dd>
                </div>
              )}

              {ret.rejection_reason && (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Motivo de rechazo
                  </dt>
                  <dd className="mt-1 text-rose-700 dark:text-rose-300">{ret.rejection_reason}</dd>
                </div>
              )}

              {ret.courier_id && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Repartidor asignado
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">
                    #{ret.courier_id}
                  </dd>
                </div>
              )}
            </dl>
          </RutaCard>

          {/* Timeline */}
          <RutaCard>
            <RutaSectionHeader title="Flujo de la devolución" subtitle="estado actual y progreso" />
            <div className="mt-4">
              {TIMELINE_STEPS.filter(
                (step, idx, arr) =>
                  arr.findIndex((s) => s.status === step.status) === idx,
              ).map((step, idx, arr) => {
                const stepIndex = ORDERED_STATUSES.indexOf(step.status)
                const isPast = stepIndex < currentIndex
                const isCurrent = step.status === ret.return_status
                const isFuture = stepIndex > currentIndex

                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          'mt-1 h-3 w-3 flex-shrink-0 rounded-full',
                          isCurrent
                            ? 'bg-sky-500'
                            : isPast
                              ? 'bg-emerald-500'
                              : 'bg-slate-300 dark:bg-slate-600',
                        ].join(' ')}
                      />
                      {idx < arr.length - 1 && (
                        <div
                          className={[
                            'mt-1 w-px flex-1',
                            isPast
                              ? 'bg-emerald-300 dark:bg-emerald-700'
                              : 'bg-slate-200 dark:bg-white/10',
                          ].join(' ')}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={[
                          'text-sm font-medium',
                          isCurrent
                            ? 'text-sky-700 dark:text-sky-300'
                            : isFuture
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100',
                        ].join(' ')}
                      >
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                            actual
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Terminal states that diverge */}
              {(ret.return_status === 'RETURN_REJECTED' ||
                ret.return_status === 'RETURN_LOST' ||
                ret.return_status === 'RETURN_CANCELLED') && (
                <div className="mt-2 flex gap-3">
                  <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-rose-500" />
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    {RETURN_STATUS_LABELS[ret.return_status]}
                  </p>
                </div>
              )}
            </div>
          </RutaCard>
        </div>

        {/* Columna derecha — acciones */}
        <div className="flex flex-col gap-5">
          <RutaCard>
            <RutaSectionHeader title="Acciones" subtitle="gestión de la devolución" />
            <div className="mt-3 flex flex-col gap-3">

              {/* Iniciar revisión */}
              {isRequested && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() => startReview(ret.id), 'Revisión iniciada.')
                  }
                >
                  {acting ? 'Procesando…' : 'Iniciar revisión'}
                </RutaButton>
              )}

              {/* Aprobar */}
              {isUnderReview && !showRejectDialog && (
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() => approveReturn(ret.id), 'Devolución aprobada.')
                  }
                >
                  {acting ? 'Aprobando…' : 'Aprobar'}
                </RutaButton>
              )}

              {/* Rechazar */}
              {isUnderReview && !showRejectDialog && (
                <RutaButton
                  type="button"
                  variant="danger"
                  disabled={acting}
                  onClick={() => setShowRejectDialog(true)}
                >
                  Rechazar
                </RutaButton>
              )}

              {/* Formulario de rechazo */}
              {isUnderReview && showRejectDialog && (
                <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.08] p-3">
                  <p className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                    Motivo del rechazo
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Indica el motivo del rechazo…"
                    className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                  />
                  <div className="mt-2 flex gap-2">
                    <RutaButton
                      type="button"
                      variant="danger"
                      disabled={acting || !rejectReason.trim()}
                      onClick={() => void handleReject()}
                    >
                      {acting ? 'Rechazando…' : 'Confirmar rechazo'}
                    </RutaButton>
                    <RutaButton
                      type="button"
                      variant="secondary"
                      disabled={acting}
                      onClick={() => { setShowRejectDialog(false); setRejectReason('') }}
                    >
                      Cancelar
                    </RutaButton>
                  </div>
                </div>
              )}

              {/* Asignar recogida (CLIENT_PICKS_UP) */}
              {isApproved && ret.return_mechanism === 'CLIENT_PICKS_UP' && !showPickupForm && (
                <RutaButton
                  type="button"
                  variant="primary"
                  disabled={acting}
                  onClick={() => void openPickupForm()}
                >
                  Asignar recogida
                </RutaButton>
              )}

              {/* Formulario de asignación de repartidor */}
              {isApproved && ret.return_mechanism === 'CLIENT_PICKS_UP' && showPickupForm && (
                <div className="rounded-md border border-slate-200 bg-white/[0.04] p-3 dark:border-white/10">
                  <p className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    Seleccionar repartidor
                  </p>
                  {loadingCouriers ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cargando repartidores…</p>
                  ) : couriers.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No hay repartidores disponibles.</p>
                  ) : (
                    <select
                      value={selectedCourierId ?? ''}
                      onChange={(e) => setSelectedCourierId(Number(e.target.value) || null)}
                      className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                    >
                      <option value="">— Seleccionar —</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="mt-2 flex gap-2">
                    <RutaButton
                      type="button"
                      variant="primary"
                      disabled={acting || !selectedCourierId}
                      onClick={() => void handleSchedulePickup()}
                    >
                      {acting ? 'Programando…' : 'Confirmar recogida'}
                    </RutaButton>
                    <RutaButton
                      type="button"
                      variant="secondary"
                      disabled={acting}
                      onClick={() => { setShowPickupForm(false); setSelectedCourierId(null) }}
                    >
                      Cancelar
                    </RutaButton>
                  </div>
                </div>
              )}

              {/* Instrucciones para BUYER_SHIPS */}
              {isApproved && ret.return_mechanism === 'BUYER_SHIPS_VIA_COURIER' && (
                <div className="rounded-md border border-sky-400/25 bg-sky-500/[0.08] p-3">
                  <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
                    Instrucciones para el comprador
                  </p>
                  <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">
                    La devolución está aprobada. El comprador debe enviar el producto a través
                    de un servicio de mensajería y compartir el número de guía. Una vez recibido,
                    marca la devolución como recibida.
                  </p>
                </div>
              )}

              {/* Marcar recibido */}
              {canMarkReceived && (
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={acting}
                  onClick={() =>
                    void runAction(() => markReceived(ret.id), 'Devolución marcada como recibida.')
                  }
                >
                  {acting ? 'Procesando…' : 'Marcar como recibida'}
                </RutaButton>
              )}

              {/* Marcar perdida */}
              {canMarkReceived && (
                <RutaButton
                  type="button"
                  variant="warning"
                  disabled={acting}
                  onClick={() => {
                    if (window.confirm('¿Marcar esta devolución como perdida?')) {
                      void runAction(() => markLost(ret.id), 'Devolución marcada como perdida.')
                    }
                  }}
                >
                  {acting ? 'Procesando…' : 'Marcar como perdida'}
                </RutaButton>
              )}

              {/* Cancelar */}
              {canCancel && (
                <RutaButton
                  type="button"
                  variant="danger"
                  disabled={acting}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancelar devolución
                </RutaButton>
              )}

              {/* Confirmación de cancelación */}
              {!isTerminal && confirmCancel && (
                <div className="rounded-md border border-rose-400/25 bg-rose-500/[0.08] p-3">
                  <p className="mb-3 text-sm text-rose-700 dark:text-rose-300">
                    ¿Confirmas cancelar esta devolución? Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <RutaButton
                      type="button"
                      variant="danger"
                      disabled={acting}
                      onClick={() =>
                        void runAction(() => cancelReturn(ret.id), 'Devolución cancelada.')
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

              {/* No hay acciones */}
              {isTerminal && (
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
