'use client'

import { useEffect, useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import { listProducts, type Product } from '@/lib/products.api'
import {
  updateOrderItems,
  type ApiError,
  type EditableOrderItem,
  type OrderDetail,
  type OrderStatus,
  type PaymentStatus,
} from '@/lib/orders.api'

/**
 * Estados y pagos en los que se pueden cambiar los productos. Espejo de
 * `EDITABLE_STATUSES` / `EDITABLE_PAYMENT_STATUSES` del backend
 * (`order_items_edit.service.ts`); aquí solo decide si se ofrece el botón.
 */
const EDITABLE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'MANUAL_REVIEW',
  'VALIDATION_APPROVED',
  'SELLER_CONFIRMED',
  'PREPARING',
  'AWAITING_COURIER_ASSIGNMENT',
  'COURIER_ASSIGNED',
  'READY_TO_SHIP',
  'SHIPMENT_HOLD',
  'READY_FOR_PICKUP',
])
const EDITABLE_PAYMENTS: ReadonlySet<PaymentStatus> = new Set<PaymentStatus>([
  'PAYMENT_NOT_STARTED',
  'PENDING_COLLECTION',
])

export function canEditOrderItems(order: OrderDetail): boolean {
  return EDITABLE_STATUSES.has(order.order_status) && EDITABLE_PAYMENTS.has(order.payment_status)
}

interface Row {
  kind: 'product' | 'custom'
  product_id: number
  description: string
  unit_price: string
  quantity: number
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

interface Props {
  order: OrderDetail
  onSaved: (order: OrderDetail) => void
  onCancel: () => void
}

/**
 * Editor de los productos de un pedido ya creado: cambiar cantidades, quitar,
 * agregar del catálogo o como línea libre. Lo que ya estaba conserva su precio
 * acordado; lo nuevo toma el precio del catálogo (lo calcula el servidor).
 */
export function EditOrderItems({ order, onSaved, onCancel }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<Row[]>(() =>
    order.items.map((i) =>
      i.product_id !== null
        ? { kind: 'product', product_id: i.product_id, description: '', unit_price: String(i.unit_price), quantity: i.quantity }
        : { kind: 'custom', product_id: 0, description: i.product_name, unit_price: String(i.unit_price), quantity: i.quantity },
    ),
  )
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listProducts({ status: 'ACTIVE', page_size: 100 })
      .then((res) => setProducts((res as { data: Product[] }).data ?? []))
      .catch(() => setProducts([]))
  }, [])

  /** Precio que ya tenía cada producto en este pedido (se respeta al guardar). */
  const agreed = new Map(order.items.filter((i) => i.product_id !== null).map((i) => [i.product_id!, i.unit_price]))
  /** Nombres de los productos del pedido, por si alguno ya no está activo. */
  const knownNames = new Map(order.items.filter((i) => i.product_id !== null).map((i) => [i.product_id!, i.product_name]))

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function unitPrice(row: Row): number {
    if (row.kind === 'custom') return Number(row.unit_price) || 0
    return agreed.get(row.product_id) ?? products.find((p) => p.id === row.product_id)?.unit_price ?? 0
  }

  const total = rows.reduce((acc, r) => acc + unitPrice(r) * r.quantity, 0)

  async function save() {
    setError(null)
    if (rows.length === 0) {
      setError('El pedido necesita al menos un producto. Para anularlo, usa «Cancelar pedido».')
      return
    }
    const invalid = rows.some((r) =>
      r.quantity < 1 ||
      (r.kind === 'product' ? !r.product_id : !r.description.trim() || r.unit_price === '' || Number(r.unit_price) < 0),
    )
    if (invalid) {
      setError('Revisa las filas: cada una necesita producto (o descripción y precio) y cantidad.')
      return
    }
    const items: EditableOrderItem[] = rows.map((r) =>
      r.kind === 'product'
        ? { product_id: r.product_id, quantity: r.quantity }
        : { description: r.description.trim(), unit_price: Number(r.unit_price), quantity: r.quantity },
    )
    setSaving(true)
    try {
      onSaved(await updateOrderItems(order.id, items, reason.trim() || undefined))
    } catch (err) {
      setError((err as ApiError).message ?? 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      {/* Cada línea en dos renglones: el nombre a todo el ancho y debajo precio,
          cantidad y subtotal. En una sola fila, dentro de la tarjeta angosta
          del detalle, el nombre quedaba aplastado a unos pocos píxeles. */}
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-2 rounded-lg border border-slate-200/90 p-2.5 dark:border-white/10"
        >
          <div className="flex items-center gap-2">
            {row.kind === 'product' ? (
              <select
                value={row.product_id || ''}
                onChange={(e) => update(idx, { product_id: Number(e.target.value) })}
                aria-label="Producto"
                className={inputClass + ' min-w-0 flex-1'}
              >
                <option value="">Selecciona un producto…</option>
                {/* Un producto del pedido que ya no está activo sigue apareciendo. */}
                {row.product_id && !products.some((p) => p.id === row.product_id) && (
                  <option value={row.product_id}>{knownNames.get(row.product_id) ?? `Producto #${row.product_id}`}</option>
                )}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCOP(agreed.get(p.id) ?? p.unit_price)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={row.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Descripción"
                aria-label="Descripción"
                className={inputClass + ' min-w-0 flex-1'}
              />
            )}
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
              aria-label="Quitar producto"
              className="shrink-0 rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              ×
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {row.kind === 'custom' ? (
              <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Precio unit.</span>
                <input
                  type="number"
                  min={0}
                  value={row.unit_price}
                  onChange={(e) => update(idx, { unit_price: e.target.value })}
                  placeholder="Precio"
                  aria-label="Precio unitario"
                  className={inputClass}
                />
              </label>
            ) : (
              <p className="min-w-0 flex-1 self-center text-xs text-slate-500 dark:text-slate-400">
                {row.product_id ? `${formatCOP(unitPrice(row))} c/u` : ' '}
              </p>
            )}
            <label className="flex w-20 flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cant.</span>
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                aria-label="Cantidad"
                className={inputClass}
              />
            </label>
            <p className="ml-auto self-center whitespace-nowrap pl-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCOP(unitPrice(row) * row.quantity)}
            </p>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((p) => [...p, { kind: 'product', product_id: 0, description: '', unit_price: '', quantity: 1 }])}
          className="rounded-md border border-brand-400/30 bg-brand-500/[0.08] px-3 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300"
        >
          + Producto del catálogo
        </button>
        <button
          type="button"
          onClick={() => setRows((p) => [...p, { kind: 'custom', product_id: 0, description: '', unit_price: '', quantity: 1 }])}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          + Línea libre
        </button>
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo del cambio (opcional): ej. el cliente llamó para sumar una caja"
        aria-label="Motivo del cambio"
        className={inputClass}
      />

      <p className="text-sm text-slate-700 dark:text-slate-300">
        Nuevo total estimado: <strong>{formatCOP(total + (order.shipping_fee ?? 0))}</strong>{' '}
        <span className="text-xs text-slate-500">(antes {formatCOP(order.total)})</span>
      </p>

      {error && (
        <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <RutaButton type="button" variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar productos'}
        </RutaButton>
        <RutaButton type="button" variant="neutral" disabled={saving} onClick={onCancel}>
          Cancelar
        </RutaButton>
      </div>
    </div>
  )
}
