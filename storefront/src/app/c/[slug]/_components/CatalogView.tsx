'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  RutaCard,
  RutaButton,
  RutaPill,
  RutaSectionHeader,
} from '@orkoruta/ui'
import {
  getProducts,
  getCategories,
  type Product,
  type Category,
  type ProductListParams,
} from '@/lib/catalog.api'
import { useStore } from '@/lib/store-context'
import { CartApiError } from '@/lib/cart.api'

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200/90 bg-white/[0.76] p-4 dark:border-white/10 dark:bg-[#1d2025]/[0.78]">
      <div className="mb-3 h-40 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="mb-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mb-3 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-8 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

function ProductCard({
  product,
  slug,
  adding,
  onAdd,
}: {
  product: Product
  slug: string
  adding: boolean
  onAdd: (product: Product) => void
}) {
  const isPromo = product.product_type === 'PROMO'
  const outOfStock = product.stock_quantity === 0

  return (
    <Link href={`/c/${slug}/product/${product.id}`} className="group block">
      <RutaCard className="flex h-full flex-col transition-shadow hover:shadow-md">
        {/* Imagen */}
        <div className="relative mb-3 h-40 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Sin imagen
              </span>
            </div>
          )}
          {isPromo && (
            <div className="absolute left-2 top-2">
              <RutaPill variant="amber">Promoción</RutaPill>
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/[0.5]">
              <RutaPill variant="slate">Sin stock</RutaPill>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <p className="mb-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
            {product.name}
          </p>
          {product.description && (
            <p className="mb-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {product.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatCOP(product.unit_price)}
            </span>
            <RutaButton
              variant="primary"
              size="sm"
              disabled={outOfStock || adding}
              onClick={(e) => {
                // La tarjeta entera es un Link al detalle; el botón no debe
                // navegar, solo agregar.
                e.preventDefault()
                onAdd(product)
              }}
            >
              {adding ? 'Agregando…' : '+ Carrito'}
            </RutaButton>
          </div>
        </div>
      </RutaCard>
    </Link>
  )
}

export default function CatalogView() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { profile, addToCart } = useStore()

  // Aviso efímero tras agregar al carrito (o su error).
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ProductListParams>({
    page: 1,
    limit: 20,
  })
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()

  const LIMIT = 20

  const fetchProducts = useCallback(
    async (params: ProductListParams) => {
      if (!slug) return
      setLoadingProducts(true)
      setError(null)
      try {
        const result = await getProducts(slug, params)
        setProducts(result.data)
        setTotal(result.pagination.total)
        setPage(result.pagination.page)
      } catch {
        setError('No pudimos cargar el catálogo. Reintentar')
        setProducts([])
      } finally {
        setLoadingProducts(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    if (!slug) return
    setLoadingCategories(true)
    getCategories(slug)
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false))
  }, [slug])

  useEffect(() => {
    fetchProducts(filters)
  }, [filters, fetchProducts])

  function applyFilters(overrides: Partial<ProductListParams>) {
    setFilters((prev) => ({
      ...prev,
      ...overrides,
      page: overrides.page !== undefined ? overrides.page : 1,
    }))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters({ search: search || undefined })
  }

  function handleCategoryClick(catId: number | undefined) {
    setSelectedCategory(catId)
    applyFilters({ category_id: catId })
  }

  const handleAddToCart = useCallback(
    async (product: Product) => {
      // No hace falta cuenta: si no hay sesión, el store abre una de invitado.
      setAddingId(product.id)
      try {
        await addToCart(product.id, 1)
        setToast({ kind: 'ok', text: `${product.name} agregado al carrito` })
      } catch (err) {
        const msg =
          err instanceof CartApiError && err.status === 401
            ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
            : 'No pudimos agregar el producto. Intenta de nuevo.'
        setToast({ kind: 'error', text: msg })
      } finally {
        setAddingId(null)
      }
    },
    [addToCart],
  )

  // El toast se oculta solo a los 2.5 s.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Toast: confirma el agregado (o el error) sin sacar del catálogo. */}
      {toast && (
        <div
          role="status"
          className={[
            'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.kind === 'ok'
              ? 'border-emerald-400/30 bg-emerald-600 text-white'
              : 'border-rose-400/30 bg-rose-600 text-white',
          ].join(' ')}
        >
          {toast.kind === 'ok' ? '✓ ' : '⚠ '}
          {toast.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar de filtros (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <RutaCard className="sticky top-20">
            <RutaSectionHeader title="Filtros" subtitle="catálogo" />

            <div className="mt-3 space-y-1">
              <button
                onClick={() => handleCategoryClick(undefined)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  selectedCategory === undefined
                    ? 'bg-sky-500/[0.12] font-medium text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]'
                }`}
              >
                Todas las categorías
              </button>

              {!loadingCategories &&
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-sky-500/[0.12] font-medium text-sky-700 dark:text-sky-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </RutaCard>
        </aside>

        {/* Área principal */}
        <div className="min-w-0 flex-1">
          {/* Bienvenida */}
          <div className="mb-4">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {profile
                ? `¡Hola, ${(profile.full_name ?? '').trim().split(/\s+/)[0] || 'de nuevo'}! 👋`
                : 'Bienvenido 👋'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {profile
                ? 'Elige lo que quieras y agrégalo al carrito.'
                : 'Explora el catálogo. Inicia sesión para hacer tu pedido.'}
            </p>
          </div>

          {/* Buscador */}
          <form onSubmit={handleSearch} className="mb-5 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos…"
              className="flex-1 rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.5] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100 dark:placeholder-slate-500"
            />
            <RutaButton type="submit" variant="primary" size="md">
              Buscar
            </RutaButton>
          </form>

          {/* Filtros móvil — categorías en chips horizontales */}
          {categories.length > 0 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              <button
                onClick={() => handleCategoryClick(undefined)}
                className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === undefined
                    ? 'border-sky-400/25 bg-sky-500/[0.12] text-sky-700 dark:text-sky-300'
                    : 'border-slate-200 bg-white/[0.85] text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`shrink-0 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'border-sky-400/25 bg-sky-500/[0.12] text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 bg-white/[0.85] text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Estado: error */}
          {error && !loadingProducts && (
            <RutaCard className="py-10 text-center">
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{error}</p>
              <RutaButton variant="neutral" onClick={() => fetchProducts(filters)}>
                Reintentar
              </RutaButton>
            </RutaCard>
          )}

          {/* Estado: loading — skeletons */}
          {loadingProducts && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Estado: empty */}
          {!loadingProducts && !error && products.length === 0 && (
            <RutaCard className="py-16 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Este comercio aún no tiene productos publicados
              </p>
            </RutaCard>
          )}

          {/* Grid de productos */}
          {!loadingProducts && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    slug={slug}
                    adding={addingId === product.id}
                    onAdd={handleAddToCart}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <RutaButton
                    variant="neutral"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => applyFilters({ page: page - 1 })}
                  >
                    ← Anterior
                  </RutaButton>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {page} / {totalPages}
                  </span>
                  <RutaButton
                    variant="neutral"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => applyFilters({ page: page + 1 })}
                  >
                    Siguiente →
                  </RutaButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
