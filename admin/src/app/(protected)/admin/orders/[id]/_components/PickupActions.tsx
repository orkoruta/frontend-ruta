'use client'

import { useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  verifyPickupIdentity,
  recordPickupCollection,
  markPickupDelivered,
} from '@/lib/pickup_ops.api'

interface PickupActionsProps {
  orderId: number
  isCod: boolean
  onActionComplete: () => void
}

const DOCUMENT_TYPES = ['CC', 'CE', 'NIT', 'PASSPORT'] as const

export function PickupActions({ orderId, isCod, onActionComplete }: PickupActionsProps) {
  // Verify identity form state
  const [docType, setDocType] = useState<string>('CC')
  const [docNumber, setDocNumber] = useState('')
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [identitySuccess, setIdentitySuccess] = useState(false)

  // Collection form state
  const [amount, setAmount] = useState('')
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [collectionSuccess, setCollectionSuccess] = useState(false)

  // Deliver state
  const [deliverConfirming, setDeliverConfirming] = useState(false)
  const [deliverLoading, setDeliverLoading] = useState(false)
  const [deliverError, setDeliverError] = useState<string | null>(null)

  async function handleVerifyIdentity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!docNumber.trim()) return

    setIdentityLoading(true)
    setIdentityError(null)
    setIdentitySuccess(false)

    try {
      await verifyPickupIdentity(orderId, docType, docNumber.trim())
      setIdentitySuccess(true)
      onActionComplete()
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : 'No pudimos verificar la identidad.')
    } finally {
      setIdentityLoading(false)
    }
  }

  async function handleRecordCollection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = parseInt(amount, 10)
    if (Number.isNaN(parsed) || parsed <= 0) return

    setCollectionLoading(true)
    setCollectionError(null)
    setCollectionSuccess(false)

    try {
      await recordPickupCollection(orderId, parsed)
      setCollectionSuccess(true)
      onActionComplete()
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : 'No pudimos registrar el cobro.')
    } finally {
      setCollectionLoading(false)
    }
  }

  async function handleMarkDelivered() {
    setDeliverLoading(true)
    setDeliverError(null)

    try {
      await markPickupDelivered(orderId)
      setDeliverConfirming(false)
      onActionComplete()
    } catch (err) {
      setDeliverError(err instanceof Error ? err.message : 'No pudimos marcar el pedido como entregado.')
    } finally {
      setDeliverLoading(false)
    }
  }

  return (
    <RutaCard>
      <RutaSectionHeader title="Operación PICKUP" subtitle="acciones en punto físico" />

      <div className="mt-4 flex flex-col gap-6">
        {/* Section 1 — Verify identity */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Verificar identidad del comprador
          </p>
          <form onSubmit={(e) => { void handleVerifyIdentity(e) }} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-36 flex-shrink-0">
                <label
                  htmlFor="pickup-doc-type"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Tipo documento
                </label>
                <select
                  id="pickup-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  disabled={identityLoading || identitySuccess}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="pickup-doc-number"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Número de documento
                </label>
                <input
                  id="pickup-doc-number"
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Ej. 1010101010"
                  disabled={identityLoading || identitySuccess}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {identityError && (
              <p
                role="alert"
                className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
              >
                {identityError}
              </p>
            )}
            {identitySuccess && (
              <p
                role="status"
                className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
              >
                Identidad verificada correctamente.
              </p>
            )}

            <RutaButton
              type="submit"
              variant="primary"
              disabled={identityLoading || identitySuccess || !docNumber.trim()}
            >
              {identityLoading ? 'Verificando…' : 'Verificar identidad'}
            </RutaButton>
          </form>
        </div>

        {/* Section 2 — Record collection (COD only) */}
        {isCod && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Registrar cobro (pago contra entrega)
            </p>
            <form onSubmit={(e) => { void handleRecordCollection(e) }} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="pickup-amount"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Monto cobrado (COP)
                </label>
                <input
                  id="pickup-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej. 105000"
                  disabled={collectionLoading || collectionSuccess}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              {collectionError && (
                <p
                  role="alert"
                  className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  {collectionError}
                </p>
              )}
              {collectionSuccess && (
                <p
                  role="status"
                  className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  Cobro registrado correctamente.
                </p>
              )}

              <RutaButton
                type="submit"
                variant="warning"
                disabled={
                  collectionLoading ||
                  collectionSuccess ||
                  !amount.trim() ||
                  parseInt(amount, 10) <= 0
                }
              >
                {collectionLoading ? 'Registrando…' : 'Registrar cobro'}
              </RutaButton>
            </form>
          </div>
        )}

        {/* Section 3 — Mark delivered */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Marcar como entregado
          </p>

          {deliverError && (
            <p
              role="alert"
              className="mb-3 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
            >
              {deliverError}
            </p>
          )}

          {!deliverConfirming ? (
            <RutaButton
              type="button"
              variant="success"
              disabled={deliverLoading}
              onClick={() => setDeliverConfirming(true)}
            >
              Marcar como entregado
            </RutaButton>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Confirmar entrega del pedido?
              </p>
              <div className="flex gap-2">
                <RutaButton
                  type="button"
                  variant="success"
                  disabled={deliverLoading}
                  onClick={() => { void handleMarkDelivered() }}
                >
                  {deliverLoading ? 'Procesando…' : 'Confirmar entrega'}
                </RutaButton>
                <RutaButton
                  type="button"
                  variant="neutral"
                  disabled={deliverLoading}
                  onClick={() => {
                    setDeliverConfirming(false)
                    setDeliverError(null)
                  }}
                >
                  Cancelar
                </RutaButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </RutaCard>
  )
}
