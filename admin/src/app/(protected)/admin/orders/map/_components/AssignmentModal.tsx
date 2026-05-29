'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import type { AvailableCourier, MapOrder, ApiError } from '@/lib/assignment.api'

interface AssignmentModalProps {
  order: MapOrder
  courier: AvailableCourier
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AssignmentModal({
  order,
  courier,
  onConfirm,
  onCancel,
}: AssignmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos completar la asignación.')
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/[0.45]"
        onClick={loading ? undefined : onCancel}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200/90 bg-white/[0.76] shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-[#1d2025]/[0.92]">
        {/* Header */}
        <div className="border-b border-slate-200/90 px-6 py-4 dark:border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            confirmar asignación
          </p>
          <h2
            id="modal-title"
            className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Asignar repartidor
          </h2>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Order info */}
          <div className="rounded-md border border-slate-200/90 bg-slate-50/[0.6] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Pedido
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
              #{order.id}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
              {order.delivery_address_line}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {order.delivery_address_city} · {formatCOP(order.total)}
            </p>
          </div>

          {/* Courier info */}
          <div className="rounded-md border border-slate-200/90 bg-slate-50/[0.6] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Repartidor
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {courier.full_name}
            </p>
            {courier.phone && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{courier.phone}</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200/90 px-6 py-4 dark:border-white/10">
          <RutaButton
            type="button"
            variant="neutral"
            disabled={loading}
            onClick={onCancel}
          >
            Cancelar
          </RutaButton>
          <RutaButton
            type="button"
            variant="primary"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? 'Asignando…' : 'Confirmar asignación'}
          </RutaButton>
        </div>
      </div>
    </div>
  )
}
