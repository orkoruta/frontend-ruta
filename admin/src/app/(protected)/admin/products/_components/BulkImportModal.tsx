'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RutaButton, RutaCard, RutaPill, RutaSectionHeader } from '@orkoruta/ui'
import {
  getProduct,
  getBulkImportJob,
  listCategories,
  requestProductImageUpload,
  startBulkImport,
  updateProduct,
  uploadFileToPresignedUrl,
  type ApiError,
  type BulkImportJob,
  type Category,
  type ProductStatus,
  type ProductType,
} from '@/lib/products.api'

interface BulkImportModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function statusLabel(status: BulkImportJob['status']): string {
  const labels: Record<BulkImportJob['status'], string> = {
    pending: 'Pendiente',
    active: 'Procesando',
    completed: 'Completado',
    failed: 'Fallido',
    cancelled: 'Cancelado',
  }
  return labels[status]
}

export function BulkImportModal({ open, onClose, onImported }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<BulkImportJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileError = useMemo(() => {
    if (!file) return null
    if (!file.name.toLowerCase().endsWith('.xlsx')) return 'Solo se aceptan archivos .xlsx.'
    if (file.size > 5 * 1024 * 1024) return 'El archivo no puede superar 5 MB.'
    return null
  }, [file])

  useEffect(() => {
    if (!job?.job_id || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return
    }

    const timer = window.setInterval(async () => {
      try {
        const nextJob = await getBulkImportJob(job.job_id)
        setJob(nextJob)
        if (nextJob.status === 'completed') onImported()
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No se pudo consultar el estado de la importación.')
      }
    }, 2500)

    return () => window.clearInterval(timer)
  }, [job?.job_id, job?.status, onImported])

  if (!open) return null

  async function handleImport() {
    if (!file || fileError) return
    setLoading(true)
    setError(null)
    try {
      const createdJob = await startBulkImport(file)
      setJob(createdJob)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No se pudo iniciar la importación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.45] p-4">
      <RutaCard className="w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <RutaSectionHeader title="Importar productos" subtitle="excel" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
          >
            Cerrar
          </button>
        </div>

        <label
          htmlFor="bulk-file"
          className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/[0.5] p-8 text-center dark:border-white/10 dark:bg-white/[0.04]"
        >
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Selecciona un archivo Excel
          </span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Columnas esperadas: name, unit_price, product_type, description, category_id, stock_quantity, image_url.
          </span>
          <input
            id="bulk-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => {
              setJob(null)
              setError(null)
              setFile(event.target.files?.[0] ?? null)
            }}
          />
        </label>

        {file && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white/[0.5] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatBytes(file.size)} · Vista previa validada por nombre, tamaño y extensión. El backend valida las filas antes de encolar.
            </p>
            {fileError && (
              <p className="mt-2 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                {fileError}
              </p>
            )}
          </div>
        )}

        {job && (
          <div className="mt-4 rounded-md border border-slate-200 p-3 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <RutaPill variant={job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'amber'}>
                {statusLabel(job.status)}
              </RutaPill>
              <span className="text-xs text-slate-500 dark:text-slate-400">Job {job.job_id}</span>
            </div>
            {job.result && (
              <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                <span>Productos creados: {job.result.created}</span>
                <span>Filas con error: {job.result.failed}</span>
              </div>
            )}
            {job.result?.errors?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-rose-700 dark:text-rose-300">
                {job.result.errors.slice(0, 5).map((item) => (
                  <li key={`${item.row}-${item.message}`}>Fila {item.row}: {item.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <RutaButton type="button" variant="neutral" onClick={onClose}>
            Cancelar
          </RutaButton>
          <RutaButton
            type="button"
            variant="primary"
            disabled={!file || !!fileError || loading}
            onClick={handleImport}
          >
            {loading ? 'Importando...' : 'Importar'}
          </RutaButton>
        </div>
      </RutaCard>
    </div>
  )
}

interface ProductEditFormState {
  name: string
  description: string
  unitPrice: string
  categoryId: string
  productType: ProductType
  stockQuantity: string
  status: ProductStatus
  imageUrl: string
}

function validateProductEdit(form: ProductEditFormState, image: File | null): string | null {
  if (!form.name.trim()) return 'El nombre es obligatorio.'
  if (!Number.isInteger(Number(form.unitPrice)) || Number(form.unitPrice) <= 0) {
    return 'El precio debe ser un entero mayor a cero.'
  }
  if (form.stockQuantity && (!Number.isInteger(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0)) {
    return 'El stock debe ser un entero mayor o igual a cero.'
  }
  if (image && !image.type.startsWith('image/')) return 'La imagen debe ser un archivo de imagen.'
  return null
}

export function ProductEditView({ productId }: { productId: number }) {
  const router = useRouter()
  const [form, setForm] = useState<ProductEditFormState | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [product, categoryResponse] = await Promise.all([
          getProduct(productId),
          listCategories(),
        ])
        if (!active) return
        setForm({
          name: product.name,
          description: product.description ?? '',
          unitPrice: String(product.unit_price),
          categoryId: product.category_id ? String(product.category_id) : '',
          productType: product.product_type,
          stockQuantity: product.stock_quantity === null ? '' : String(product.stock_quantity),
          status: product.status,
          imageUrl: product.image_url ?? '',
        })
        setCategories(categoryResponse.items)
      } catch (err) {
        const apiErr = err as ApiError
        if (active) setError(apiErr.message ?? 'No pudimos cargar el producto.')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (Number.isFinite(productId)) void load()
    return () => {
      active = false
    }
  }, [productId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return

    const validationError = validateProductEdit(form, image)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      let imageUrl = form.imageUrl || null
      if (image) {
        const upload = await requestProductImageUpload(productId, image)
        await uploadFileToPresignedUrl(upload, image)
        imageUrl = upload.public_url
      }
      await updateProduct(productId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit_price: Number(form.unitPrice),
        currency: 'COP',
        product_type: form.productType,
        category_id: form.categoryId ? Number(form.categoryId) : null,
        stock_quantity: form.stockQuantity ? Number(form.stockQuantity) : null,
        image_url: imageUrl,
        status: form.status,
      })
      router.push('/admin/products')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando producto...</p>
  }

  if (!form) {
    return (
      <RutaCard>
        <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? 'Producto no encontrado.'}</p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/products" className="text-sm text-sky-700 hover:underline dark:text-sky-300">
          Volver a productos
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Editar producto
        </h1>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Datos del producto" subtitle={`producto #${productId}`} />
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nombre
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Descripción
            </label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="unitPrice" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Precio COP
              </label>
              <input
                id="unitPrice"
                required
                inputMode="numeric"
                value={form.unitPrice}
                onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="stockQuantity" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Stock
              </label>
              <input
                id="stockQuantity"
                inputMode="numeric"
                value={form.stockQuantity}
                onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="productType" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Tipo
              </label>
              <select
                id="productType"
                value={form.productType}
                onChange={(event) => setForm({ ...form, productType: event.target.value as ProductType })}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
              >
                <option value="VENTA_NORMAL">Venta normal</option>
                <option value="PROMOCION">Promoción</option>
              </select>
            </div>
            <div>
              <label htmlFor="categoryId" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Categoría
              </label>
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Estado
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ProductStatus })}
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-[#1d2025] dark:text-slate-100"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="image" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Imagen
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-500/[0.12] file:px-3 file:py-1.5 file:text-sky-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:file:text-sky-300"
            />
            {form.imageUrl && (
              <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                Imagen actual: {form.imageUrl}
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Link href="/admin/products">
              <RutaButton type="button" variant="neutral">Cancelar</RutaButton>
            </Link>
            <RutaButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </RutaButton>
          </div>
        </form>
      </RutaCard>
    </div>
  )
}
