'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  createProduct,
  listCategories,
  requestProductImageUpload,
  updateProduct,
  uploadFileToPresignedUrl,
  type ApiError,
  type Category,
  type ProductInput,
  type ProductType,
} from '@/lib/products.api'

interface FormState {
  name: string
  description: string
  unitPrice: string
  categoryId: string
  productType: ProductType
  stockQuantity: string
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  unitPrice: '',
  categoryId: '',
  productType: 'VENTA_NORMAL',
  stockQuantity: '',
}

function buildInput(form: FormState): ProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    unit_price: Number(form.unitPrice),
    currency: 'COP',
    product_type: form.productType,
    category_id: form.categoryId ? Number(form.categoryId) : undefined,
    stock_quantity: form.stockQuantity ? Number(form.stockQuantity) : undefined,
  }
}

export default function NewProductPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCategories()
      .then((response) => setCategories(response.data))
      .catch((err) => {
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar las categorías.')
      })
  }, [])

  function validate(): string | null {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const product = await createProduct(buildInput(form))
      if (image) {
        const upload = await requestProductImageUpload(product.id, image)
        await uploadFileToPresignedUrl(upload, image)
        await updateProduct(product.id, { image_url: upload.public_url })
      }
      router.push('/admin/products')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message ?? 'No pudimos crear el producto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/products" className="text-sm text-sky-700 hover:underline dark:text-sky-300">
          Volver a productos
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Crear producto
        </h1>
      </div>

      <RutaCard>
        <RutaSectionHeader title="Datos del producto" subtitle="catálogo" />
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
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
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
                placeholder="Opcional"
                className="w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <RutaButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar producto'}
            </RutaButton>
          </div>
        </form>
      </RutaCard>
    </div>
  )
}
