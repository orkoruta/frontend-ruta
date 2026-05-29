const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type ProductStatus = 'ACTIVE' | 'INACTIVE'
export type ProductType = 'VENTA_NORMAL' | 'PROMOCION'
export type BulkImportStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface Product {
  id: number
  client_id: number
  sku: string | null
  name: string
  description: string | null
  product_type: ProductType
  unit_price: number
  currency: string
  category_id: number | null
  image_url: string | null
  status: ProductStatus
  stock_quantity: number | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  client_id: number
  name: string
  parent_category_id: number | null
  sort_order: number
  status: ProductStatus
  created_at: string
  updated_at: string
}

export interface ProductInput {
  name: string
  description?: string
  unit_price: number
  currency?: string
  product_type: ProductType
  category_id?: number | null
  stock_quantity?: number | null
  image_url?: string | null
  status?: ProductStatus
}

export interface ProductListParams {
  q?: string
  category_id?: number
  status?: ProductStatus
  page?: number
  page_size?: number
}

export interface BulkImportJob {
  job_id: string
  status: BulkImportStatus
  message?: string
  result?: {
    created: number
    failed: number
    errors: Array<{ row: number; message: string }>
  }
  error?: string
}

export interface PresignedUpload {
  upload_url: string
  public_url: string
  expires_at: string
  upload_token?: string
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => null)) as T | ApiError | null
  if (!res.ok) {
    throw (data ?? { code: 'REQUEST_FAILED', message: 'No se pudo completar la solicitud.' }) as ApiError
  }
  return data as T
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })
  return readJson<T>(res)
}

export async function listProducts(params: ProductListParams = {}) {
  return request<{ items: Product[]; pagination: Pagination }>(
    `/admin/products${toQuery({
      q: params.q,
      category_id: params.category_id,
      status: params.status,
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
    })}`,
  )
}

export async function getProduct(productId: number) {
  return request<Product>(`/admin/products/${productId}`)
}

export async function createProduct(input: ProductInput) {
  return request<Product>('/admin/products', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(input),
  })
}

export async function updateProduct(productId: number, input: Partial<ProductInput>) {
  return request<Product>(`/admin/products/${productId}`, {
    method: 'PATCH',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(input),
  })
}

export async function listCategories() {
  return request<{ items: Category[]; pagination: Pagination }>(
    '/admin/categories?page=1&page_size=100',
  )
}

export async function requestProductImageUpload(productId: number, file: File) {
  return request<PresignedUpload>('/uploads/presigned-url', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({
      purpose: 'PRODUCT_IMAGE',
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      related_entity_type: 'product',
      related_entity_id: productId,
    }),
  })
}

export async function uploadFileToPresignedUrl(upload: PresignedUpload, file: File) {
  const res = await fetch(upload.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) {
    throw { code: 'UPLOAD_FAILED', message: 'No se pudo subir la imagen.' } satisfies ApiError
  }
}

export async function startBulkImport(file: File) {
  const form = new FormData()
  form.set('file', file)
  return request<BulkImportJob>('/admin/products/bulk-import', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey() },
    body: form,
  })
}

export async function getBulkImportJob(jobId: string) {
  return request<BulkImportJob>(`/admin/products/bulk-import/${jobId}`, {
    headers: { 'X-Idempotency-Key': idempotencyKey() },
  })
}
