'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RutaCard, RutaButton, RutaSectionHeader, RutaPill } from '@orkoruta/ui'
import {
  getDraftOrder,
  updateCartItem,
  removeCartItem,
  CartApiError,
  type DraftOrder,
  type CartItem,
} from '@/lib/cart.api'

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function CartSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 sm:px-6">
      <div className="mb-6 h-7 w-40 rounded-md bg-slate-200 dark:bg-slate-700" />
      <RutaCard>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-md bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-8 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </RutaCard>
    </div>
  )
}

interface CartItemRowProps {
  item: CartItem
  orderId: number
  onUpdate: (itemId: number, quantity: number) => Promise<void>
  onRemove: (itemId: number) => Promise<void>
  disabled: boolean
}

function CartItemRow({ item, onUpdate, onRemove, disabled }: CartItemRowProps) {
  const outOfStock = item.stock_quantity === 0
  const maxQty = outOfStock ? 0 : Math.min(item.stock_quantity, 99)

  async function decrement() {
    if (item.quantity <= 1) return
    await onUpdate(item.id, item.quantity - 1)
  }

  async function increment() {
    if (item.quantity >= maxQty) return
    await onUpdate(item.id, item.quantity + 1)
  }

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-white/[0.06]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {item.product_name}
          </span>
          {outOfStock && <RutaPill variant="slate">Sin stock</RutaPill>}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {formatCOP(item.unit_price)} c/u
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={decrement}
          disabled={disabled || item.quantity <= 1}
          aria-label="Reducir cantidad"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
          {item.quantity}
        </span>
        <button
          onClick={increment}
          disabled={disabled || outOfStock || item.quantity >= maxQty}
          aria-label="Aumentar cantidad"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          +
        </button>
      </div>

      <div className="w-24 shrink-0 text-right">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {formatCOP(item.subtotal)}
        </p>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`Eliminar ${item.product_name}`}
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-rose-200/80 bg-rose-500/[0.06] text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-400/20 dark:text-rose-400"
      >
        ✕
      </button>
    </div>
  )
}

export default function CartView() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<DraftOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const loadCart = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const draft = await getDraftOrder()
      setOrder(draft)
    } catch (err) {
      if (err instanceof CartApiError && err.status === 401) {
        router.push(`/c/${slug}/login?return=/c/${slug}/cart`)
        return
      }
      setError('No pudimos cargar tu carrito. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  const handleUpdate = useCallback(
    async (itemId: number, quantity: number) => {
      if (!order) return
      setMutating(true)
      try {
        await updateCartItem(order.id, itemId, quantity)
        await loadCart()
      } catch {
        setError('No se pudo actualizar el item. Por favor intenta de nuevo.')
      } finally {
        setMutating(false)
      }
    },
    [order, loadCart],
  )

  const handleRemove = useCallback(
    async (itemId: number) => {
      if (!order) return
      setMutating(true)
      try {
        await removeCartItem(order.id, itemId)
        await loadCart()
      } catch {
        setError('No se pudo eliminar el item. Por favor intenta de nuevo.')
      } finally {
        setMutating(false)
      }
    },
    [order, loadCart],
  )

  if (loading) return <CartSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="inline-block px-10 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <RutaButton variant="neutral" onClick={loadCart}>
            Reintentar
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  const hasItems = order && order.items.length > 0
  const hasOutOfStock = order?.items.some((i) => i.stock_quantity === 0) ?? false
  const canCheckout = hasItems && !hasOutOfStock && !mutating

  if (!hasItems) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="px-10 py-12">
          <div className="mb-6 flex justify-center">
            <span className="text-5xl text-slate-300 dark:text-slate-600">🛒</span>
          </div>
          <h2 className="mb-2 text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tu carrito está vacío
          </h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Agrega productos desde el catálogo para comenzar tu pedido.
          </p>
          <Link href={`/c/${slug}`}>
            <RutaButton variant="primary" className="justify-center">
              Ver catálogo
            </RutaButton>
          </Link>
        </RutaCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        Mi carrito
      </h1>

      <RutaCard className="mb-4">
        <RutaSectionHeader title="Productos" subtitle="artículos en tu carrito" />

        {hasOutOfStock && (
          <div className="mt-3 rounded-md border border-rose-200/80 bg-rose-500/[0.06] px-3 py-2 dark:border-rose-400/20">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Algunos productos no tienen stock disponible. Elimínalos para continuar.
            </p>
          </div>
        )}

        <div className="mt-4">
          {order.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              orderId={order.id}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              disabled={mutating}
            />
          ))}
        </div>
      </RutaCard>

      <RutaCard>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subtotal</span>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            {formatCOP(order.subtotal)}
          </span>
        </div>

        {order.total !== order.subtotal && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</span>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {formatCOP(order.total)}
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <RutaButton
            variant="primary"
            size="lg"
            disabled={!canCheckout}
            onClick={() => router.push(`/c/${slug}/checkout`)}
            className="w-full justify-center"
          >
            {mutating ? 'Actualizando…' : 'Ir a checkout'}
          </RutaButton>

          <Link href={`/c/${slug}`} className="w-full">
            <RutaButton variant="neutral" className="w-full justify-center">
              ← Seguir comprando
            </RutaButton>
          </Link>
        </div>
      </RutaCard>
    </div>
  )
}
