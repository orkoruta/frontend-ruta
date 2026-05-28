'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import { BulkImportModal } from './_components/BulkImportModal'
import {
  listCategories,
  listProducts,
  type ApiError,
  type Category,
  type Product,
  type ProductStatus,
} from '@/lib/products.api'

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function statusPill(status: ProductStatus) {
  return status === 'ACTIVE'
    ? <RutaPill variant="green">Activo</RutaPill>
    : <RutaPill variant="slate">Inactivo</RutaPill>
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProductStatus | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const categoriesById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]))
  }, [categories])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        listProducts({
          q: query.trim() || undefined,
          status: status || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          page_size: 50,
        }),
        listCategories(),
      ])
      setProducts(productResponse.items)
      setCategories(categoryResponse.items)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos cargar los productos.')
    } finally {
      setLoading(false)
    }
  }, [categoryId, query, status])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadProducts()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            catálogo
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Productos
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <RutaButton type="button" variant="neutral" onClick={() => setModalOpen(true)}>
            Importar Excel
          </RutaButton>
          <Link href="/admin/products/new">
            <RutaButton type="button" variant="primary">Crear producto</RutaButton>
          </Link>
        </div>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Filtros" subtitle="búsqueda" />
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, SKU o descripción"
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          />
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductStatus | '')}
            className="rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
          <RutaButton type="submit" variant="neutral" disabled={loading}>
            Filtrar
          </RutaButton>
        </form>
      </RutaCard>

      <RutaCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader title="Inventario" subtitle="productos" className="mb-0" />
        </div>

        {error && (
          <div className="m-4 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No hay productos con esos filtros.
            </p>
            <Link href="/admin/products/new" className="mt-3 inline-flex">
              <RutaButton type="button" variant="primary">Crear producto</RutaButton>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100/[0.7] text-xs uppercase tracking-[0.16em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Producto</th>
                  <th className="px-4 py-3 font-bold">Categoría</th>
                  <th className="px-4 py-3 font-bold">Tipo</th>
                  <th className="px-4 py-3 font-bold">Precio</th>
                  <th className="px-4 py-3 font-bold">Stock</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
                {products.map((product) => (
                  <tr key={product.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">#{product.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      {product.category_id ? categoriesById.get(product.category_id) ?? `#${product.category_id}` : 'Sin categoría'}
                    </td>
                    <td className="px-4 py-3">
                      {product.product_type === 'PROMOCION' ? <RutaPill variant="violet">Promoción</RutaPill> : <RutaPill>Venta normal</RutaPill>}
                    </td>
                    <td className="px-4 py-3">{COP_FORMATTER.format(product.unit_price)}</td>
                    <td className="px-4 py-3">{product.stock_quantity ?? 'Sin control'}</td>
                    <td className="px-4 py-3">{statusPill(product.status)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${product.id}`}>
                        <RutaButton type="button" variant="secondary" size="sm">Editar</RutaButton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RutaCard>

      <BulkImportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onImported={() => void loadProducts()}
      />
    </div>
  )
}
