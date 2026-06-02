'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { listProducts, type Product } from '@/lib/products.api'
import { listBuyers, type Buyer } from '@/lib/users.api'
import {
  createCorporateOrder,
  createCorporateOrderRecurring,
  repeatLastCorporateOrder,
  type DeliveryType,
  type PaymentMethod,
  type PaymentSubmethod,
  type RecurrencePeriodicity,
  type ApiError,
} from '@/lib/corporate_orders.api'

type Mode = 'new' | 'recurring' | 'repeat-last'

const DELIVERY_LABELS: Record<DeliveryType, string> = {
  SHIP: 'Domicilio',
  PICKUP: 'Punto físico',
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ONLINE_AT_ORDER: 'Online al pedir',
  ELECTRONIC_ON_DELIVERY: 'Electrónico al entregar',
  CASH_ON_DELIVERY: 'Contra entrega (efectivo)',
}

const SUBMETHOD_LABELS: Record<PaymentSubmethod, string> = {
  DATAFONO: 'Datáfono',
  BANK_TRANSFER: 'Transferencia bancaria',
  PAYMENT_LINK: 'Link de pago',
  QR: 'QR',
}

const PERIODICITY_LABELS: Record<RecurrencePeriodicity, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM_INTERVAL: 'Intervalo personalizado',
}

const SUBMETHODS_FOR: Partial<Record<PaymentMethod, PaymentSubmethod[]>> = {
  ELECTRONIC_ON_DELIVERY: ['DATAFONO', 'BANK_TRANSFER', 'PAYMENT_LINK', 'QR'],
}

interface ItemRow {
  product_id: number
  quantity: number
}

interface Props {
  onSuccess?: (orderId: number) => void
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function CorporateOrderForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('new')
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  // Campos comunes
  const [buyerId, setBuyerId] = useState<string>('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('SHIP')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY')
  const [paymentSubmethod, setPaymentSubmethod] = useState<PaymentSubmethod | ''>('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ product_id: 0, quantity: 1 }])

  // Recurrencia
  const [periodicity, setPeriodicity] = useState<RecurrencePeriodicity>('MONTHLY')
  const [customIntervalDays, setCustomIntervalDays] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [buyersRes, productsRes] = await Promise.all([
          listBuyers({ page_size: 200 }),
          listProducts({ status: 'ACTIVE', page_size: 200 }),
        ])
        if (!active) return
        setBuyers(buyersRes.data ?? [])
        setProducts((productsRes as { items: Product[] }).items ?? [])
      } catch {
        // no-op: form still usable with empty lists
      } finally {
        if (active) setLoadingCatalog(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const availableSubmethods = SUBMETHODS_FOR[paymentMethod] ?? []

  function addItem() {
    setItems((prev) => [...prev, { product_id: 0, quantity: 1 }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemRow, value: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const total = items.reduce((acc, row) => {
    const product = products.find((p) => p.id === row.product_id)
    return acc + (product ? product.unit_price * row.quantity : 0)
  }, 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const numBuyerId = Number(buyerId)
    if (!numBuyerId) {
      setError('Selecciona un comprador corporativo.')
      return
    }
    if (!contactName.trim()) {
      setError('El nombre del contacto corporativo es requerido.')
      return
    }
    if (mode !== 'repeat-last' && items.some((it) => !it.product_id || it.quantity < 1)) {
      setError('Todos los ítems deben tener un producto y cantidad válida.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'repeat-last') {
        const order = await repeatLastCorporateOrder({ buyer_id: numBuyerId })
        setSuccess(`Pedido corporativo #${order.id} creado (clon del último pedido).`)
        onSuccess?.(order.id)
        return
      }

      const baseInput = {
        buyer_id: numBuyerId,
        corporate_contact: {
          name: contactName.trim(),
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
        },
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        payment_method_submethod: (paymentSubmethod || undefined) as PaymentSubmethod | undefined,
        notes: notes.trim() || undefined,
      }

      if (mode === 'recurring') {
        const result = await createCorporateOrderRecurring({
          ...baseInput,
          recurrence_periodicity: periodicity,
          custom_interval_days:
            periodicity === 'CUSTOM_INTERVAL' && customIntervalDays
              ? Number(customIntervalDays)
              : undefined,
        })
        setSuccess(
          `Pedido corporativo #${result.order.id} creado como recurrente.`,
        )
        onSuccess?.(result.order.id)
      } else {
        const order = await createCorporateOrder(baseInput)
        setSuccess(`Pedido corporativo #${order.id} creado en borrador.`)
        onSuccess?.(order.id)
      }
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el pedido corporativo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          pedidos corporativos
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          Nuevo pedido corporativo
        </h1>
      </div>

      {/* Tipo de creación */}
      <RutaCard>
        <RutaSectionHeader title="Tipo de pedido" subtitle="elige cómo crear el pedido" />
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              { value: 'new', label: 'Nuevo pedido' },
              { value: 'recurring', label: 'Nuevo recurrente' },
              { value: 'repeat-last', label: 'Repetir último' },
            ] as { value: Mode; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={[
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                mode === value
                  ? 'border-sky-400/50 bg-sky-500/[0.15] text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 text-slate-600 hover:bg-white/[0.06] dark:border-white/10 dark:text-slate-400',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </RutaCard>

      {/* Comprador */}
      <RutaCard>
        <RutaSectionHeader title="Comprador" subtitle="cuenta corporativa en RUTA" />
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Comprador corporativo <span className="text-rose-500">*</span>
          </label>
          {loadingCatalog ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando compradores…</p>
          ) : (
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            >
              <option value="">Selecciona un comprador…</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name ?? b.email} — {b.email}
                </option>
              ))}
            </select>
          )}
        </div>

        {mode !== 'repeat-last' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Nombre del contacto corporativo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre de quien recibe o gestiona"
                required
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Email (opcional)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </RutaCard>

      {/* Ítems */}
      {mode !== 'repeat-last' && (
        <RutaCard>
          <div className="flex items-center justify-between">
            <RutaSectionHeader title="Ítems" subtitle="productos del catálogo" />
            <button
              type="button"
              onClick={addItem}
              className="rounded-md border border-sky-400/30 bg-sky-500/[0.08] px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-500/[0.15] dark:text-sky-300"
            >
              + Agregar ítem
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {items.map((row, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <select
                    value={row.product_id || ''}
                    onChange={(e) => updateItem(idx, 'product_id', Number(e.target.value))}
                    required
                    className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                  >
                    <option value="">Selecciona un producto…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCOP(p.unit_price)}
                        {p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    placeholder="Cant."
                    required
                    className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2 py-2 text-xs font-medium text-rose-700 hover:bg-rose-500/[0.15] dark:text-rose-300"
                    aria-label="Quitar ítem"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {total > 0 && (
            <p className="mt-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
              Total estimado: {formatCOP(total)}
            </p>
          )}
        </RutaCard>
      )}

      {/* Entrega y pago */}
      {mode !== 'repeat-last' && (
        <RutaCard>
          <RutaSectionHeader title="Entrega y pago" subtitle="" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Tipo de entrega
              </label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              >
                {(Object.keys(DELIVERY_LABELS) as DeliveryType[]).map((k) => (
                  <option key={k} value={k}>
                    {DELIVERY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Método de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod)
                  setPaymentSubmethod('')
                }}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              >
                {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {availableSubmethods.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Submétodo de pago (opcional)
                </label>
                <select
                  value={paymentSubmethod}
                  onChange={(e) => setPaymentSubmethod(e.target.value as PaymentSubmethod | '')}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                >
                  <option value="">Sin especificar</option>
                  {availableSubmethods.map((s) => (
                    <option key={s} value={s}>
                      {SUBMETHOD_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Notas internas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Instrucciones adicionales para el pedido"
                className="w-full resize-none rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>
        </RutaCard>
      )}

      {/* Recurrencia */}
      {mode === 'recurring' && (
        <RutaCard>
          <RutaSectionHeader title="Recurrencia" subtitle="periodicidad de generación automática" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Periodicidad <span className="text-rose-500">*</span>
              </label>
              <select
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value as RecurrencePeriodicity)}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              >
                {(Object.keys(PERIODICITY_LABELS) as RecurrencePeriodicity[]).map((k) => (
                  <option key={k} value={k}>
                    {PERIODICITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {periodicity === 'CUSTOM_INTERVAL' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Intervalo en días <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={customIntervalDays}
                  onChange={(e) => setCustomIntervalDays(e.target.value)}
                  placeholder="p.ej. 10"
                  required={periodicity === 'CUSTOM_INTERVAL'}
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                />
              </div>
            )}
          </div>
        </RutaCard>
      )}

      {/* Feedback y botón */}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </p>
      )}

      <div className="flex justify-end">
        <RutaButton type="submit" disabled={submitting || loadingCatalog} variant="primary">
          {submitting
            ? 'Creando…'
            : mode === 'repeat-last'
            ? 'Repetir último pedido'
            : mode === 'recurring'
            ? 'Crear pedido recurrente'
            : 'Crear pedido corporativo'}
        </RutaButton>
      </div>
    </form>
  )
}
