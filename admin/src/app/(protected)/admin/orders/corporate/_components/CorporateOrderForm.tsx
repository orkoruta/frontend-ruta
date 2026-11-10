'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { listProducts, type Product } from '@/lib/products.api'
import { listPickupPoints, type PickupPoint } from '@/lib/users.api'
import DeliveryTargetFields, { type CorporateDeliveryAddress } from './DeliveryTargetFields'
import BuyerPicker, { type BuyerSelection } from './BuyerPicker'
import {
  createCorporateOrder,
  createCorporateOrderRecurring,
  repeatLastCorporateOrder,
  type DeliveryType,
  type PaymentMethod,
  type PaymentSubmethod,
  type RecurrencePeriodicity,
  type CorporateOrderItem,
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

/**
 * Una fila del pedido: producto del catálogo o línea libre. La libre existe
 * porque cada restaurante pide algo distinto (presentación, punto de
 * maduración, cantidades raras) y no tiene sentido crear un producto para eso.
 */
interface ItemRow {
  kind: 'product' | 'custom'
  product_id: number
  description: string
  unit_price: string
  quantity: number
}

const EMPTY_ROW: ItemRow = { kind: 'product', product_id: 0, description: '', unit_price: '', quantity: 1 }

/**
 * `corporate`: restaurantes y negocios. `retail`: pedido al detal que el
 * negocio toma por teléfono o WhatsApp para una persona. Mismo formulario; el
 * detal no pide contacto corporativo ni ofrece «Repetir último».
 */
export type OrderFormVariant = 'corporate' | 'retail'

interface Props {
  variant?: OrderFormVariant
  onSuccess?: (orderId: number) => void
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function CorporateOrderForm({ variant = 'corporate', onSuccess }: Props) {
  const isRetail = variant === 'retail'
  const noun = isRetail ? 'cliente' : 'restaurante'
  const [mode, setMode] = useState<Mode>('new')
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  // Campos comunes
  const [buyer, setBuyer] = useState<BuyerSelection>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('SHIP')
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([])
  const [pickupPointId, setPickupPointId] = useState<number | ''>('')
  const [address, setAddress] = useState<CorporateDeliveryAddress>({
    line: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null,
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY')
  const [paymentSubmethod, setPaymentSubmethod] = useState<PaymentSubmethod | ''>('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ROW }])

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
        // Los compradores ya no se cargan aquí: los busca `BuyerPicker` en el
        // servidor a medida que se escribe.
        const [productsRes, pickupRes] = await Promise.all([
          listProducts({ status: 'ACTIVE', page_size: 100 }),
          listPickupPoints({ status: 'ACTIVE', page_size: 100 }),
        ])
        if (!active) return
        setProducts((productsRes as { data: Product[] }).data ?? [])
        setPickupPoints(pickupRes.data ?? [])
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar los productos.')
      } finally {
        if (active) setLoadingCatalog(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const availableSubmethods = SUBMETHODS_FOR[paymentMethod] ?? []

  function addItem(kind: ItemRow['kind'] = 'product') {
    setItems((prev) => [...prev, { ...EMPTY_ROW, kind }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    )
  }

  function rowUnitPrice(row: ItemRow): number {
    if (row.kind === 'custom') return Number(row.unit_price) || 0
    return products.find((p) => p.id === row.product_id)?.unit_price ?? 0
  }

  const total = items.reduce((acc, row) => acc + rowUnitPrice(row) * row.quantity, 0)

  function isRowValid(row: ItemRow): boolean {
    if (row.quantity < 1) return false
    if (row.kind === 'product') return row.product_id > 0
    return row.description.trim().length > 0 && row.unit_price !== '' && Number(row.unit_price) >= 0
  }

  function toApiItem(row: ItemRow): CorporateOrderItem {
    return row.kind === 'product'
      ? { product_id: row.product_id, quantity: row.quantity }
      : { description: row.description.trim(), unit_price: Number(row.unit_price), quantity: row.quantity }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!buyer) {
      setError(`Busca y selecciona el ${noun}, o regístralo como nuevo.`)
      return
    }
    if (buyer.kind === 'new' && (!buyer.full_name.trim() || !buyer.phone.trim())) {
      setError(`Escribe el nombre y el celular del ${noun} nuevo.`)
      return
    }
    if (mode === 'repeat-last' && buyer.kind !== 'existing') {
      setError('Para repetir el último pedido elige un comprador que ya haya pedido.')
      return
    }
    // En detal el contacto es el propio cliente; en corporativo, quien recibe.
    const buyerName = buyer.kind === 'existing' ? buyer.buyer.full_name || buyer.buyer.email : buyer.full_name.trim()
    const buyerPhone = buyer.kind === 'existing' ? buyer.buyer.phone ?? undefined : buyer.phone.trim()
    // Sin contacto escrito, recibe el propio comprador.
    const effectiveContactName = contactName.trim() || buyerName
    if (mode !== 'repeat-last' && !effectiveContactName) {
      setError('El nombre del contacto es requerido.')
      return
    }
    if (mode !== 'repeat-last' && items.some((it) => !isRowValid(it))) {
      setError('Cada ítem necesita un producto (o una descripción con precio) y una cantidad válida.')
      return
    }
    if (mode !== 'repeat-last' && deliveryType === 'SHIP') {
      if (!address.line.trim() || !address.city.trim() || !address.state.trim()) {
        setError('Completa la dirección de entrega.')
        return
      }
      if (address.latitude === null || address.longitude === null) {
        setError('Marca la ubicación en el mapa: sin coordenadas el pedido no llega al mapa de asignación.')
        return
      }
    }
    if (mode !== 'repeat-last' && deliveryType === 'PICKUP' && !pickupPointId) {
      setError('Selecciona el punto de recogida.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'repeat-last' && buyer.kind === 'existing') {
        const order = await repeatLastCorporateOrder({ buyer_id: buyer.buyer.id })
        setSuccess(`Pedido corporativo #${order.id} creado (clon del último pedido).`)
        onSuccess?.(order.id)
        return
      }

      const baseInput = {
        ...(buyer.kind === 'existing'
          ? { buyer_id: buyer.buyer.id }
          : { new_buyer: { full_name: buyer.full_name.trim(), phone: buyer.phone.trim() } }),
        buyer_type: isRetail ? ('INDIVIDUAL' as const) : ('CORPORATE' as const),
        corporate_contact: {
          name: effectiveContactName,
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || (isRetail ? buyerPhone : undefined),
        },
        items: items.map(toApiItem),
        delivery_type: deliveryType,
        ...(deliveryType === 'SHIP'
          ? {
              delivery_address: {
                line: address.line.trim(),
                city: address.city.trim(),
                state: address.state.trim(),
                country: 'CO',
                postal_code: address.postal_code?.trim() || undefined,
                latitude: address.latitude as number,
                longitude: address.longitude as number,
                instructions: address.instructions?.trim() || undefined,
              },
            }
          : { pickup_point_id: Number(pickupPointId) }),
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
          `Pedido #${result.order.id} creado. Se repetirá ${PERIODICITY_LABELS[periodicity].toLowerCase()} automáticamente.`,
        )
        onSuccess?.(result.order.id)
      } else {
        const order = await createCorporateOrder(baseInput)
        setSuccess(`Pedido #${order.id} creado.`)
        onSuccess?.(order.id)
      }
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {isRetail ? 'pedidos al detal' : 'pedidos corporativos'}
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          {isRetail ? 'Nuevo pedido al detal' : 'Nuevo pedido corporativo'}
        </h1>
        {isRetail && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Para la persona que te pide por teléfono o WhatsApp. Si es cliente fijo, usa
            «Recurrente» y el pedido se repite solo cada semana, quincena o mes.
          </p>
        )}
      </div>

      {/* Tipo de creación */}
      <RutaCard>
        <RutaSectionHeader title="Tipo de pedido" subtitle="elige cómo crear el pedido" />
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              { value: 'new', label: 'Una sola vez' },
              { value: 'recurring', label: 'Recurrente (se repite solo)' },
              // «Repetir último» clona el último corporativo del comprador.
              ...(isRetail ? [] : [{ value: 'repeat-last', label: 'Repetir último' }]),
            ] as { value: Mode; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={[
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                mode === value
                  ? 'border-brand-400/50 bg-brand-500/[0.15] text-brand-700 dark:text-brand-300'
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
        <RutaSectionHeader
          title={isRetail ? 'Cliente' : 'Restaurante / negocio'}
          subtitle={isRetail ? 'a quién le llevamos el pedido' : 'quién hace el pedido'}
        />
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            {isRetail ? 'Cliente' : 'Restaurante'} <span className="text-rose-500">*</span>
          </label>
          <BuyerPicker
            value={buyer}
            onChange={setBuyer}
            noun={noun}
            allowNew={mode !== 'repeat-last'}
            disabled={submitting}
          />
        </div>

        {mode !== 'repeat-last' && !isRetail && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Contacto que recibe (opcional: si lo dejas vacío, es el restaurante)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre de quien recibe o gestiona"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </RutaCard>

      {/* Ítems */}
      {mode !== 'repeat-last' && (
        <RutaCard>
          <div className="flex items-center justify-between">
            <RutaSectionHeader title="Ítems" subtitle="del catálogo o con descripción libre" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addItem('product')}
                className="rounded-md border border-brand-400/30 bg-brand-500/[0.08] px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-500/[0.15] dark:text-brand-300"
              >
                + Producto del catálogo
              </button>
              <button
                type="button"
                onClick={() => addItem('custom')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white/[0.06] dark:border-white/15 dark:text-slate-300"
              >
                + Línea libre
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {items.map((row, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                {row.kind === 'product' ? (
                  <div className="min-w-0 flex-1">
                    <select
                      value={row.product_id || ''}
                      onChange={(e) => updateItem(idx, { product_id: Number(e.target.value) })}
                      required
                      className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Qué pidió (ej.: 20 aguacates maduros para hoy, cortados)"
                        aria-label="Descripción del ítem"
                        required
                        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min={0}
                        value={row.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                        placeholder="Precio unit."
                        aria-label="Precio unitario"
                        required
                        className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
                      />
                    </div>
                  </>
                )}
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    placeholder="Cant."
                    required
                    className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              >
                {(Object.keys(DELIVERY_LABELS) as DeliveryType[]).map((k) => (
                  <option key={k} value={k}>
                    {DELIVERY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <DeliveryTargetFields
                deliveryType={deliveryType}
                address={address}
                pickupPoints={pickupPoints}
                pickupPointId={pickupPointId}
                disabled={submitting}
                onAddressChange={setAddress}
                onPickupPointChange={setPickupPointId}
              />
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
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                className="w-full resize-none rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
                  className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
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
            : isRetail
            ? 'Crear pedido al detal'
            : 'Crear pedido corporativo'}
        </RutaButton>
      </div>
    </form>
  )
}
