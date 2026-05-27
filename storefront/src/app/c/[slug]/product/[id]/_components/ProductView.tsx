'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { RutaCard, RutaButton, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { getProductById, type Product } from '@/lib/catalog.api'

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-80 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-4">
          <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  )
}

export default function ProductView() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!slug || !id) return
    setLoading(true)
    setError(null)
    getProductById(slug, id)
      .then(setProduct)
      .catch(() => setError('No pudimos cargar el producto.'))
      .finally(() => setLoading(false))
  }, [slug, id])

  if (loading) return <ProductSkeleton />

  if (error || !product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <RutaCard className="inline-block px-12 py-10">
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {error ?? 'Producto no encontrado.'}
          </p>
          <RutaButton variant="neutral" onClick={() => router.back()}>
            ← Volver al catálogo
          </RutaButton>
        </RutaCard>
      </div>
    )
  }

  const isPromo = product.product_type === 'PROMO'
  const outOfStock = product.stock_quantity === 0
  const maxQty = outOfStock ? 0 : Math.min(product.stock_quantity, 99)

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1))
  }

  function increment() {
    setQuantity((q) => Math.min(maxQty, q + 1))
  }

  function handleAddToCart() {
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Link
          href={`/c/${slug}`}
          className="hover:text-slate-700 dark:hover:text-slate-300"
        >
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Imagen */}
        <RutaCard className="overflow-hidden p-0">
          <div className="relative flex h-72 items-center justify-center bg-slate-100 dark:bg-slate-800 sm:h-80 md:h-96">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain"
              />
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Sin imagen
              </span>
            )}
          </div>
        </RutaCard>

        {/* Detalle */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-start gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {product.name}
              </h1>
              {isPromo && <RutaPill variant="amber">Promoción</RutaPill>}
              {outOfStock && <RutaPill variant="slate">Sin stock</RutaPill>}
            </div>

            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCOP(product.unit_price)}
            </p>
          </div>

          {product.description && (
            <RutaCard>
              <RutaSectionHeader title="Descripción" subtitle="producto" />
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {product.description}
              </p>
            </RutaCard>
          )}

          <RutaCard>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stock disponible:{' '}
              <span
                className={`font-semibold ${
                  outOfStock
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {outOfStock ? '0' : product.stock_quantity}
              </span>
            </p>
          </RutaCard>

          {/* Selector de cantidad */}
          {!outOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">Cantidad:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={decrement}
                  disabled={quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {quantity}
                </span>
                <button
                  onClick={increment}
                  disabled={quantity >= maxQty}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Botón agregar */}
          <RutaButton
            variant={added ? 'success' : 'primary'}
            size="lg"
            disabled={outOfStock}
            onClick={handleAddToCart}
            className="w-full justify-center"
          >
            {added ? '✓ Agregado al carrito' : outOfStock ? 'Sin stock' : 'Agregar al carrito'}
          </RutaButton>

          <RutaButton
            variant="neutral"
            size="sm"
            onClick={() => router.back()}
            className="justify-center"
          >
            ← Volver al catálogo
          </RutaButton>
        </div>
      </div>
    </div>
  )
}
