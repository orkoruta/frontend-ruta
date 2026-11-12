import { expect, test, type Page } from '@playwright/test'
import { loginAs } from './helpers/auth.helper'

/**
 * Dashboard operativo (por entregar / entregados con filtros de fecha) y
 * productos visibles en el listado de pedidos.
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

function json(body: unknown) {
  return { status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) }
}

function dashOrder(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    order_status: 'PREPARING',
    payment_status: 'PENDING_COLLECTION',
    payment_method: 'CASH_ON_DELIVERY',
    delivery_type: 'SHIP',
    buyer_name: 'Ana Compradora',
    buyer_phone: '+573001112233',
    courier_id: null,
    courier_name: null,
    address: 'Calle 93 #15-20, Bogotá',
    total: 70000,
    units: 3,
    scheduled_delivery_date: '2026-11-12',
    created_at: '2026-11-11T15:00:00.000Z',
    delivered_at: null,
    day: '2026-11-12',
    overdue: false,
    items: [
      { product_name: 'Caja 4 kg', sku: 'AVO-4KG', quantity: 1 },
      { product_name: 'Caja 2 kg', sku: 'AVO-2KG', quantity: 2 },
    ],
    ...overrides,
  }
}

function section(orders: ReturnType<typeof dashOrder>[]) {
  const total = orders.reduce((a, o) => a + o.total, 0)
  return {
    count: orders.length,
    total_amount: total,
    units: orders.reduce((a, o) => a + o.units, 0),
    by_status: [{ status: 'PREPARING', count: orders.length, total_amount: total }],
    by_courier: [{ courier_id: null, courier_name: 'Sin repartidor', count: orders.length, total_amount: total }],
    by_day: [{ date: '2026-11-12', count: orders.length, total_amount: total }],
    by_payment_method: [{ payment_method: 'CASH_ON_DELIVERY', count: orders.length, total_amount: total }],
    products: [{ product_id: 7, product_name: 'Caja 4 kg', sku: 'AVO-4KG', quantity: orders.length, orders: orders.length, amount: 45000 }],
    truncated: false,
    orders,
  }
}

async function mockApi(page: Page, onOperations: (url: URL) => void = () => {}) {
  await page.route('http://127.0.0.1:3001/**', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: PREFLIGHT })

    if (url.pathname === '/admin/metrics/operations') {
      onOperations(url)
      const includeBacklog = url.searchParams.get('include_backlog') === 'true'
      const pending = [dashOrder(701)]
      if (includeBacklog) pending.unshift(dashOrder(690, { overdue: true, day: '2026-11-10', scheduled_delivery_date: '2026-11-10' }))
      return route.fulfill(
        json({
          date_from: url.searchParams.get('date_from'),
          date_to: url.searchParams.get('date_to'),
          today: '2026-11-12',
          include_backlog: includeBacklog,
          pending: { ...section(pending), backlog_count: 1, backlog_amount: 70000, undated_count: 0 },
          delivered: section([
            dashOrder(650, {
              order_status: 'DELIVERED',
              courier_id: 5,
              courier_name: 'Pedro Repartidor',
              delivered_at: '2026-11-12T16:30:00.000Z',
              items: [{ product_name: 'Aguacate Hass x6', sku: null, quantity: 4 }],
            }),
          ]),
        }),
      )
    }
    if (url.pathname === '/admin/metrics') {
      return route.fulfill(json({ orders_today: 3, orders_by_status: [], revenue_last_7_days: 0, active_couriers: 2, registered_buyers: 9 }))
    }
    if (url.pathname === '/admin/couriers') {
      return route.fulfill(json({ data: [{ id: 5, full_name: 'Pedro Repartidor' }], pagination: { page: 1, page_size: 100, total: 1 } }))
    }
    if (url.pathname === '/admin/orders') {
      return route.fulfill(
        json({
          data: [
            {
              id: 701,
              order_status: 'PREPARING',
              payment_status: 'PENDING_COLLECTION',
              delivery_type: 'SHIP',
              buyer_name: 'Ana Compradora',
              buyer_phone: '+573001112233',
              buyer_is_guest: false,
              total: 70000,
              courier_name: null,
              created_at: '2026-11-11T15:00:00.000Z',
              order_origin: 'BUYER_UI',
              buyer_type: 'INDIVIDUAL',
              items: [
                { product_id: 7, product_name: 'Caja 4 kg', quantity: 1 },
                { product_id: 8, product_name: 'Caja 2 kg', quantity: 2 },
                { product_id: null, product_name: 'Aguacates maduros', quantity: 5 },
                { product_id: 9, product_name: 'Limones', quantity: 1 },
                { product_id: 10, product_name: 'Mangos', quantity: 3 },
              ],
            },
          ],
          pagination: { page: 1, page_size: 20, total: 1 },
        }),
      )
    }
    return route.fulfill({ status: 404, contentType: 'application/json', headers: CORS, body: '{"code":"RESOURCE_NOT_FOUND","message":"no simulado"}' })
  })
}

test('dashboard: por entregar y entregados con filtros de fecha', async ({ page }) => {
  await loginAs(page, 'OPERATOR_CLIENT')
  const calls: URL[] = []
  await mockApi(page, (url) => calls.push(url))

  await page.goto('/admin/dashboard')

  // Por entregar: el pedido con sus productos.
  await expect(page.getByRole('tab', { name: 'Por entregar (1)' })).toBeVisible()
  await expect(page.getByRole('link', { name: '#701' })).toBeVisible()
  await expect(page.getByText('Caja 2 kg').first()).toBeVisible()

  // Rango rápido «Este mes» → se piden las fechas del mes.
  await page.getByRole('button', { name: 'Este mes' }).click()
  await expect.poll(() => calls.at(-1)?.searchParams.get('date_from')?.endsWith('-01')).toBe(true)

  // Fecha manual.
  await page.getByLabel('Desde').fill('2026-11-01')
  await page.getByLabel('Hasta').fill('2026-11-12')
  await expect.poll(() => `${calls.at(-1)?.searchParams.get('date_from')}..${calls.at(-1)?.searchParams.get('date_to')}`)
    .toBe('2026-11-01..2026-11-12')

  // Atrasados: al incluirlos aparece el pedido de días anteriores.
  await page.getByLabel('Incluir atrasados').check()
  await expect(page.getByRole('link', { name: '#690' })).toBeVisible()
  await expect(page.getByText('· atrasado')).toBeVisible()

  // Filtro por repartidor.
  await page.getByLabel('Repartidor').selectOption('5')
  await expect.poll(() => calls.at(-1)?.searchParams.get('courier_id')).toBe('5')

  // Entregados.
  await page.getByRole('tab', { name: 'Entregados (1)' }).click()
  await expect(page.getByRole('link', { name: '#650' })).toBeVisible()
  await expect(page.getByText('Aguacate Hass x6').first()).toBeVisible()
  await expect(page.getByRole('row', { name: /#650/ }).getByText('Pedro Repartidor')).toBeVisible()
})

test('listado de pedidos: muestra los productos de cada pedido', async ({ page }) => {
  await loginAs(page, 'ADMIN_CLIENT')
  await mockApi(page)

  await page.goto('/admin/orders')

  const row = page.getByRole('row', { name: /#701/ })
  await expect(row.getByText('Caja 4 kg')).toBeVisible()
  await expect(row.getByText('Aguacates maduros')).toBeVisible()
  await expect(row.getByText('5×')).toBeVisible()
  // Pasadas 4 líneas, el resto se resume.
  await expect(row.getByText('+1 más (3 und.)')).toBeVisible()
})
