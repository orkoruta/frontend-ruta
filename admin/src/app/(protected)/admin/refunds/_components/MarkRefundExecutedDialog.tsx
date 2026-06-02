'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import {
  markRefundExecuted,
  type Refund,
  type RefundResult,
} from '@/lib/refunds.api'

interface Props {
  refund: Refund
  onSuccess: (updated: Refund) => void
  onCancel: () => void
}

export function MarkRefundExecutedDialog({ refund, onSuccess, onCancel }: Props) {
  const [result, setResult] = useState<RefundResult>('REFUNDED')
  const [amountExecuted, setAmountExecuted] = useState('')
  const [externalId, setExternalId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showAmountField = result === 'PARTIALLY_REFUNDED'
  const showExternalId =
    refund.refund_modality === 'BANK_REFUND' && result !== 'FAILED'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const amountNum =
        result === 'PARTIALLY_REFUNDED' && amountExecuted.trim()
          ? parseFloat(amountExecuted)
          : undefined

      const updated = await markRefundExecuted(
        refund.id,
        result,
        amountNum,
        externalId.trim() || undefined,
      )
      onSuccess(updated)
    } catch (err) {
      const apiErr = err as { message?: string }
      setError(apiErr.message ?? 'No pudimos marcar el reembolso como ejecutado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/[0.06] p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Marcar reembolso como ejecutado
      </p>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="flex flex-col gap-4">
        {/* Resultado */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Resultado
          </label>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as RefundResult)}
            disabled={loading}
            className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          >
            <option value="REFUNDED">Reembolsado completamente</option>
            <option value="PARTIALLY_REFUNDED">Reembolso parcial</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>

        {/* Monto ejecutado (solo parcial) */}
        {showAmountField && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Monto ejecutado (COP)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amountExecuted}
              onChange={(e) => setAmountExecuted(e.target.value)}
              placeholder={`Máx ${refund.amount.toLocaleString('es-CO')}`}
              disabled={loading}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        )}

        {/* ID proveedor (solo BANK_REFUND exitoso) */}
        {showExternalId && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              ID de reembolso del proveedor (opcional)
            </label>
            <input
              type="text"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="Ej. wompi-refund-abc123"
              disabled={loading}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <RutaButton
            type="submit"
            variant={result === 'FAILED' ? 'danger' : 'success'}
            disabled={loading || (showAmountField && !amountExecuted.trim())}
          >
            {loading ? 'Guardando…' : 'Confirmar'}
          </RutaButton>
          <RutaButton type="button" variant="neutral" disabled={loading} onClick={onCancel}>
            Cancelar
          </RutaButton>
        </div>
      </form>
    </div>
  )
}
