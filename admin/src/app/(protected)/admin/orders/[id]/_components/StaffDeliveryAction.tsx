'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import {
  markDeliveredByStaff,
  type ApiError,
  type OrderDetail,
  type OrderStatus,
  type StaffCollectionMethod,
} from '@/lib/orders.api'

/**
 * Estados desde los que el propio negocio puede dar el pedido por entregado.
 * Espeja `ADMIN_DIRECT_DELIVERY_FROM` del backend (`state_machine.ts`); aquí
 * solo decide si se ofrece el botón, quien manda es el servidor.
 */
export const STAFF_DELIVERABLE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'AWAITING_COURIER_ASSIGNMENT',
  'COURIER_ASSIGNED',
  'READY_TO_SHIP',
  'SHIPMENT_HOLD',
  'SHIPPED',
  'IN_TRANSIT',
  'ON_HOLD',
  'OUT_FOR_DELIVERY',
  'DELIVERY_ATTEMPTED',
  'DELIVERY_RESCHEDULED',
  'ARRIVED_AT_CUSTOMER',
  'PAYMENT_COLLECTION_PENDING',
  'CASH_COLLECTION_PENDING',
  'PAYMENT_COLLECTED_ELECTRONIC',
  'PAYMENT_COLLECTED_CASH',
])

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface StaffDeliveryActionProps {
  order: OrderDetail
  disabled?: boolean
  onDelivered: (order: OrderDetail) => void
  onError: (message: string) => void
}

/**
 * «Lo entregamos nosotros». Para cuando el dueño o un operador lleva el pedido
 * en persona: lo deja entregado sin pasar por la app del repartidor.
 *
 * En contra entrega pregunta cuánto se cobró y cómo, porque ese cobro queda
 * registrado a nombre del negocio (no de un repartidor) y así no se le cuadra a
 * nadie en el recaudo semanal.
 */
export function StaffDeliveryAction({ order, disabled, onDelivered, onError }: StaffDeliveryActionProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState(String(order.total))
  const [method, setMethod] = useState<StaffCollectionMethod>('CASH')
  const [notes, setNotes] = useState('')

  const needsCollection = order.payment_status === 'PENDING_COLLECTION'

  async function submit() {
    const parsed = Number(amount)
    if (needsCollection && (!Number.isFinite(parsed) || parsed < 0)) {
      onError('Escribe un valor cobrado válido.')
      return
    }
    setSaving(true)
    try {
      const updated = await markDeliveredByStaff(order.id, {
        ...(needsCollection ? { collected_amount: parsed, collection_method: method } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      setOpen(false)
      onDelivered(updated)
    } catch (err) {
      onError((err as ApiError).message ?? 'No pudimos marcar el pedido como entregado.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <RutaButton type="button" variant="success" disabled={disabled} onClick={() => setOpen(true)}>
        Marcar como entregado (lo entregamos nosotros)
      </RutaButton>
    )
  }

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100'

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/[0.08] p-3">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        El pedido queda <strong>entregado</strong> a nombre del negocio, sin repartidor.
        {order.courier && ' El repartidor asignado ya no lo verá como pendiente.'}
      </p>

      {needsCollection && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="staff-collected" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Valor cobrado (total del pedido: {formatCOP(order.total)})
            </label>
            <input
              id="staff-collected"
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="staff-method" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Cómo pagó
            </label>
            <select
              id="staff-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as StaffCollectionMethod)}
              className={inputClass}
            >
              <option value="CASH">Efectivo</option>
              <option value="ELECTRONIC">Transferencia / Nequi / datáfono</option>
            </select>
          </div>
        </>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="staff-notes" className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Nota (opcional)
        </label>
        <input
          id="staff-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej.: lo recibió el portero"
          className={inputClass}
        />
      </div>

      <div className="flex gap-2">
        <RutaButton type="button" variant="success" disabled={saving} onClick={() => void submit()}>
          {saving ? 'Guardando…' : 'Confirmar entrega'}
        </RutaButton>
        <RutaButton type="button" variant="neutral" disabled={saving} onClick={() => setOpen(false)}>
          Cancelar
        </RutaButton>
      </div>
    </div>
  )
}
