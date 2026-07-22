'use client'

import { useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import ReceiptCapture from './ReceiptCapture'
import {
  recordCollection,
  type ApiError,
  type CollectionMethod,
  type CourierOrderDetail,
  type ElectronicSubmethod,
} from '@/lib/courier_orders.api'

interface CollectionFormProps {
  orderId: number
  totalDue: number
  onSuccess: (updated: CourierOrderDetail) => void
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

const INPUT_CLASS =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

const SELECT_CLASS =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100'

export default function CollectionForm({ orderId, totalDue, onSuccess }: CollectionFormProps) {
  const [amount, setAmount] = useState(String(totalDue))
  const [method, setMethod] = useState<CollectionMethod>('CASH')
  const [submethod, setSubmethod] = useState<ElectronicSubmethod>('DATAFONO')
  const [externalTxnId, setExternalTxnId] = useState('')
  const [notes, setNotes] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!evidenceFile) {
      setError('La foto del recibo es obligatoria.')
      return
    }
    const parsedAmount = Number(amount.replace(/[^0-9]/g, ''))
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Ingresa un monto válido.')
      return
    }

    setActing(true)
    setError(null)
    try {
      const updated = await recordCollection(orderId, {
        amount: parsedAmount,
        currency: 'COP',
        method,
        electronic_submethod: method === 'ELECTRONIC' ? submethod : undefined,
        external_txn_id: externalTxnId.trim() || undefined,
        notes: notes.trim() || undefined,
        evidence: evidenceFile,
      })
      onSuccess(updated)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos registrar el cobro.')
    } finally {
      setActing(false)
    }
  }

  return (
    <RutaCard>
      <RutaSectionHeader title="Registrar cobro" subtitle="contra entrega" />

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        <div className="rounded-md border border-amber-400/25 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Monto a cobrar: <strong>{formatCOP(totalDue)}</strong>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Monto recibido (COP)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Método de cobro
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as CollectionMethod)}
            className={SELECT_CLASS}
          >
            <option value="CASH">Efectivo</option>
            <option value="ELECTRONIC">Electrónico</option>
          </select>
        </div>

        {method === 'ELECTRONIC' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Submétodo
              </label>
              <select
                value={submethod}
                onChange={(e) => setSubmethod(e.target.value as ElectronicSubmethod)}
                className={SELECT_CLASS}
              >
                <option value="DATAFONO">Datáfono</option>
                <option value="QR">QR</option>
                <option value="BANK_TRANSFER">Transferencia bancaria</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                ID de transacción (opcional)
              </label>
              <input
                type="text"
                value={externalTxnId}
                onChange={(e) => setExternalTxnId(e.target.value)}
                placeholder="Número de aprobación"
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Foto del recibo <span className="text-rose-500">*</span>
          </label>
          <ReceiptCapture file={evidenceFile} onCapture={setEvidenceFile} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones del cobro"
            className={INPUT_CLASS}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <RutaButton
          type="submit"
          variant="success"
          disabled={acting}
          className="min-h-[52px] w-full justify-center text-base"
        >
          {acting ? 'Registrando…' : 'Confirmar cobro'}
        </RutaButton>
      </form>
    </RutaCard>
  )
}
