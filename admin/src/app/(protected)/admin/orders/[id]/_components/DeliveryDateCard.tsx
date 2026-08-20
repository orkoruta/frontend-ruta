'use client'

import { useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { setDeliveryDate, type ApiError } from '@/lib/orders.api'
import { formatDeliveryDate, todayDateOnly } from '@orkoruta/web-shared'

interface DeliveryDateCardProps {
  orderId: number
  /** Día ya programado (`YYYY-MM-DD`), o `null` si aún no se ha fijado. */
  scheduledDeliveryDate: string | null
  /**
   * `false` cuando el pedido ya terminó: el backend rechaza el cambio, así que
   * la tarjeta se muestra en solo lectura en vez de ofrecer un botón que fallaría.
   */
  editable: boolean
  onSaved: () => void
}

export function DeliveryDateCard({
  orderId,
  scheduledDeliveryDate,
  editable,
  onSaved,
}: DeliveryDateCardProps) {
  const [value, setValue] = useState(scheduledDeliveryDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Tras recargar el pedido, el input debe reflejar lo que quedó guardado —
  // si no, una edición descartada seguiría en pantalla como si fuera el valor real.
  useEffect(() => {
    setValue(scheduledDeliveryDate ?? '')
  }, [scheduledDeliveryDate])

  async function save(next: string | null) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await setDeliveryDate(orderId, next)
      setSuccess(next ? 'Día de entrega guardado.' : 'Se quitó el día de entrega.')
      onSaved()
    } catch (err) {
      setError((err as ApiError).message ?? 'No pudimos guardar el día de entrega.')
    } finally {
      setSaving(false)
    }
  }

  const formatted = formatDeliveryDate(scheduledDeliveryDate)
  const isDirty = value !== (scheduledDeliveryDate ?? '')

  return (
    <RutaCard>
      <RutaSectionHeader title="Día de entrega" subtitle="programación" />

      <p className="text-sm text-slate-700 dark:text-slate-300">
        {formatted ? (
          <>
            Entrega programada para{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatted}</span>.
          </>
        ) : (
          'Todavía no has fijado un día de entrega para este pedido.'
        )}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        El comprador y el repartidor ven este día.
      </p>

      {editable && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label
              htmlFor="scheduled-delivery-date"
              className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            >
              Fecha
            </label>
            <input
              id="scheduled-delivery-date"
              type="date"
              value={value}
              min={todayDateOnly()}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
              className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100"
            />
          </div>

          <RutaButton
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || !value || !isDirty}
            onClick={() => void save(value)}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </RutaButton>

          {scheduledDeliveryDate && (
            <RutaButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => void save(null)}
            >
              Quitar
            </RutaButton>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}
    </RutaCard>
  )
}
