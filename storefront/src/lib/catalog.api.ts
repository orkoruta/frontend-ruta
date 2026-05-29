const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface ClientPublicInfo {
  id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  frontend_mode: string
}

export interface Category {
  id: number
  name: string
  parent_id: number | null
}

export interface Product {
  id: number
  name: string
  description: string | null
  unit_price: number
  currency: string
  product_type: string
  image_url: string | null
  stock_quantity: number
  status: string
  category_id: number | null
}

export interface PaginatedProducts {
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface PickupPoint {
  id: number
  name: string
  address: string
  latitude: number | null
  longitude: number | null
}

export interface ProductListParams {
  category_id?: number
  search?: string
  page?: number
  limit?: number
  sort?: 'name' | 'price_asc' | 'price_desc'
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }))
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export async function getClientBySlug(slug: string): Promise<ClientPublicInfo> {
  return apiFetch<ClientPublicInfo>(`${API_BASE}/public/clients/${encodeURIComponent(slug)}`)
}

export async function getCategories(slug: string): Promise<Category[]> {
  return apiFetch<Category[]>(`${API_BASE}/public/clients/${encodeURIComponent(slug)}/categories`)
}

export async function getProducts(
  slug: string,
  params?: ProductListParams,
): Promise<PaginatedProducts> {
  const url = new URL(`${API_BASE}/public/clients/${encodeURIComponent(slug)}/products`)
  if (params?.category_id != null) url.searchParams.set('category_id', String(params.category_id))
  if (params?.search) url.searchParams.set('search', params.search)
  if (params?.page) url.searchParams.set('page', String(params.page))
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  if (params?.sort) url.searchParams.set('sort', params.sort)
  return apiFetch<PaginatedProducts>(url.toString())
}

export async function getProductById(slug: string, id: string): Promise<Product> {
  return apiFetch<Product>(
    `${API_BASE}/public/clients/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`,
  )
}

export async function getPickupPoints(slug: string): Promise<PickupPoint[]> {
  return apiFetch<PickupPoint[]>(
    `${API_BASE}/public/clients/${encodeURIComponent(slug)}/pickup-points`,
  )
}
