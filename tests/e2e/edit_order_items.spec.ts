import { expect, test } from '@playwright/test'
import { loginAs } from './helpers/auth.helper'

/**
 * Editar los productos de un pedido ya creado desde su detalle.
 */

const CORS = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:3002',
  'Access-Control-Allow-Credentials': 'true',
}
const PREFLIGHT = {
  ...CORS,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Idempotency-Key',
}

const ORDER_ID = 603 // debe estar entre los ids estáticos del detalle

function makeOrder(status: string, items: Array<Record<string, unknown>>, total: number) {
  return {
    id: ORDER_ID,
    order_status: status,
    payment_status: 'PENDING_COLLECTION',
    refund_status: 'REFUND_NOT_REQUIRED',
    delivery_type: 'SHIP',
    order_origin: 'BUYER_UI',
    buyer_type: 'INDIVIDUAL',
    delivery_address: 'Calle 93 #15-20, Bogotá',
    delivery_instructions_text: null,
    corporate_contact: null,
    pickup_point_name: null,
    scheduled_delivery_date: null,
    payment_method: 'CASH_ON_DELIVERY',
    payment_method_submethod: null,
    buyer: { id: 1, name: 'Ana Compradora', email: 'ana@piloto.dev', phone: '+573001112233', is_guest: false },
    courier: null,
    items,
    subtotal: total,
    shipping_fee: 0,
    total,
    notes: null,
    payment: null,
    history: [],
    created_at: '2026-11-10T12:00:00.000Z',
    updated_at: '2026-11-10T12:00:00.000Z',
  }
}

test('editar productos: cambiar cantidad, agregar línea libre y quitar', async ({ page }) => {
  await loginAs(page, 'ADMIN_CLIENT')

  let current = makeOrder(
    'PREPARING',
    [
      { id: 1, product_id: 7, product_name: 'Caja 4 kg', product_sku: 'AVO-4KG', quantity: 1, unit_price: 45000, subtotal: 45000 },
      { id: 2, product_id: 8, product_name: 'Caja 2 kg', product_sku: 'AVO-2KG', quantity: 1, unit_price: 25000, subtotal: 25000 },
    ],
    70000,
  )
  let sent: { items: unknown[]; reason?: string } | null = null

  await page.route('http://127.0.0.1:3001/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: PREFLIGHT })
    if (url.pathname === `/admin/orders/${ORDER_ID}` && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(current) })
    }
    if (url.pathname === '/admin/products' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          data: [
            { id: 7, name: 'Caja 4 kg', unit_price: 48000, sku: 'AVO-4KG', status: 'ACTIVE' },
            { id: 8, name: 'Caja 2 kg', unit_price: 25000, sku: 'AVO-2KG', status: 'ACTIVE' },
          ],
          pagination: { page: 1, page_size: 100, total: 2 },
        }),
      })
    }
    if (url.pathname === `/admin/orders/${ORDER_ID}/items` && method === 'PUT') {
      sent = JSON.parse(route.request().postData() ?? '{}')
      current = makeOrder(
        'PREPARING',
        [
          { id: 3, product_id: 7, product_name: 'Caja 4 kg', product_sku: 'AVO-4KG', quantity: 2, unit_price: 45000, subtotal: 90000 },
          { id: 4, product_id: null, product_name: 'Aguacates maduros', product_sku: null, quantity: 5, unit_price: 1500, subtotal: 7500 },
        ],
        97500,
      )
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(current) })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', headers: CORS, body: '{"code":"RESOURCE_NOT_FOUND","message":"no simulado"}' })
  })

  await page.goto(`/admin/orders/${ORDER_ID}`)
  await page.getByRole('button', { name: 'Editar productos' }).click()

  // Cantidad de la Caja 4 kg: 1 → 2 (conserva su precio acordado de 45000).
  await page.getByLabel('Cantidad').first().fill('2')
  // Quitar la Caja 2 kg.
  await page.getByRole('button', { name: 'Quitar producto' }).nth(1).click()
  // Línea libre.
  await page.getByRole('button', { name: '+ Línea libre' }).click()
  await page.getByLabel('Descripción').fill('Aguacates maduros')
  await page.getByLabel('Precio unitario').fill('1500')
  await page.getByLabel('Cantidad').last().fill('5')
  await page.getByLabel('Motivo del cambio').fill('El cliente llamó')

  await expect(page.getByText(/Nuevo total estimado/)).toContainText('97.500')
  await page.getByRole('button', { name: 'Guardar productos' }).click()

  await expect(page.getByText('Productos actualizados. El total del pedido se recalculó.')).toBeVisible()
  await expect(page.getByText('Aguacates maduros')).toBeVisible()
  expect(sent).toEqual({
    items: [
      { product_id: 7, quantity: 2 },
      { description: 'Aguacates maduros', unit_price: 1500, quantity: 5 },
    ],
    reason: 'El cliente llamó',
  })
})

test('pedido en camino: no ofrece editar productos', async ({ page }) => {
  await loginAs(page, 'ADMIN_CLIENT')
  const order = makeOrder('OUT_FOR_DELIVERY', [
    { id: 1, product_id: 7, product_name: 'Caja 4 kg', product_sku: null, quantity: 1, unit_price: 45000, subtotal: 45000 },
  ], 45000)
  await page.route('http://127.0.0.1:3001/**', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: PREFLIGHT })
    if (url.pathname === `/admin/orders/${ORDER_ID}`) {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(order) })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', headers: CORS, body: '{}' })
  })
  await page.goto(`/admin/orders/${ORDER_ID}`)
  await expect(page.getByText('Resumen del pedido')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar productos' })).toHaveCount(0)
})
