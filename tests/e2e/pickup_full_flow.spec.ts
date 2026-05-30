import { expect, test, type Page } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Flujo PICKUP completo — E2E Suite (4.QA-1)
//
// Usa un único catch-all handler **/v1/** por test con dispatch por
// pathname + method para evitar ambigüedades de matching en Playwright.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = '2026-05-29T12:00:00.000Z'

type UserType = 'ADMIN_CLIENT' | 'OPERATOR_CLIENT'
type OrderStatus = string
type PaymentMethod = 'ONLINE_AT_ORDER' | 'ON_DELIVERY'

async function setSession(page: Page, userType: UserType) {
  await page.addInitScript(({ type }) => {
    window.sessionStorage.setItem(
      'ruta_session',
      JSON.stringify({
        user_id: type === 'OPERATOR_CLIENT' ? 22 : 21,
        client_id: 1,
        user_type: type,
        acting_via_control_view: false,
      }),
    )
  }, { type: userType })
}

function makePickupOrder(id: number, status: OrderStatus, paymentMethod: PaymentMethod, paymentStatus: string) {
  return {
    id,
    order_status: status,
    delivery_type: 'PICKUP',
    pickup_point_name: 'Sede Chapinero',
    payment_method: paymentMethod,
    buyer: { name: 'Ana Compradora', email: 'comprador1@piloto.dev', phone: '+573201001001' },
    courier: null,
    items: [{ id: 1, product_name: 'Manzana Roja', product_sku: 'FRU-001', quantity: 2, unit_price: 4500, subtotal: 9000 }],
    subtotal: 9000,
    shipping_fee: null,
    total: 9000,
    notes: null,
    payment: {
      status: paymentStatus,
      method: paymentMethod,
      amount: 9000,
      confirmed_at: paymentMethod === 'ONLINE_AT_ORDER' ? NOW : null,
      evidence_url: null,
    },
    history: [{ id: 1, to_state: status, reason: null, actor_role: 'ADMIN_CLIENT', created_at: NOW }],
    created_at: NOW,
  }
}

function makeShipOrder(id: number) {
  return {
    id,
    order_status: 'READY_TO_SHIP',
    delivery_type: 'SHIP',
    delivery_address: 'Cll 72 #10-45, Bogota',
    pickup_point_name: null,
    payment_method: 'ONLINE_AT_ORDER',
    buyer: { name: 'Juan Comprador', email: 'comprador2@piloto.dev', phone: '+573201001002' },
    courier: null,
    items: [{ id: 2, product_name: 'Banano', quantity: 1, unit_price: 3200, subtotal: 3200 }],
    subtotal: 3200,
    shipping_fee: 5000,
    total: 8200,
    notes: null,
    payment: { status: 'PAID', method: 'ONLINE_AT_ORDER', amount: 8200, confirmed_at: NOW, evidence_url: null },
    history: [{ id: 10, to_state: 'READY_TO_SHIP', reason: null, actor_role: 'ADMIN_CLIENT', created_at: NOW }],
    created_at: NOW,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flujo PICKUP completo', () => {

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test('Verificar identidad → Marcar entregado (pedido prepagado online)', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'
    const orderId = 601

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3002', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Idempotency-Key', 'Access-Control-Allow-Credentials': 'true' } })
      } else if (path === `/v1/admin/orders/${orderId}` && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3002', 'Access-Control-Allow-Credentials': 'true' }, body: JSON.stringify(makePickupOrder(orderId, status, 'ONLINE_AT_ORDER', 'PAID')) })
      } else if (path === `/v1/admin/orders/${orderId}/verify-pickup-identity`) {
        // No cambiar status: PickupActions debe seguir visible (condición READY_FOR_PICKUP)
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3002', 'Access-Control-Allow-Credentials': 'true' } })
      } else if (path === `/v1/admin/orders/${orderId}/mark-pickup-delivered`) {
        status = 'DELIVERED'
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3002', 'Access-Control-Allow-Credentials': 'true' } })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Verificar identidad del comprador')).toBeVisible()

    await page.locator('#pickup-doc-number').click()
    await page.locator('#pickup-doc-number').type('1010101010')
    const btn = page.getByRole('button', { name: 'Verificar identidad' })
    await expect(btn).toBeEnabled()
    await btn.click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()
    await expect(page.getByText('Entregado').first()).toBeVisible()
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test('Registrar cobro COD → Marcar entregado', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'
    let collectionDone = false
    const orderId = 602

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()
      if (path === `/v1/admin/orders/${orderId}` && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makePickupOrder(orderId, status, 'ON_DELIVERY', collectionDone ? 'PAYMENT_COLLECTED' : 'PENDING_COLLECTION')) })
      } else if (path === `/v1/admin/orders/${orderId}/verify-pickup-identity`) {
        // No cambiar status: PickupActions sigue visible (condición READY_FOR_PICKUP)
        await route.fulfill({ status: 204 })
      } else if (path === `/v1/admin/orders/${orderId}/pickup-collection`) {
        collectionDone = true
        // No cambiar status: PickupActions sigue visible
        await route.fulfill({ status: 204 })
      } else if (path === `/v1/admin/orders/${orderId}/mark-pickup-delivered`) {
        status = 'DELIVERED'
        await route.fulfill({ status: 204 })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Registrar cobro (pago contra entrega)')).toBeVisible()

    await page.locator('#pickup-doc-number').click()
    await page.locator('#pickup-doc-number').type('2020202020')
    const btnV = page.getByRole('button', { name: 'Verificar identidad' })
    await expect(btnV).toBeEnabled()
    await btnV.click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    await page.locator('#pickup-amount').click()
    await page.locator('#pickup-amount').type('9000')
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    await expect(page.getByText('Cobro registrado correctamente.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()
    await expect(page.getByText('Entregado').first()).toBeVisible()
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece para pedidos SHIP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')
    const orderId = 603

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === `/v1/admin/orders/${orderId}`) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makeShipOrder(orderId)) })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Punto físico (PICKUP)')).not.toBeVisible()
    await expect(page.getByText('Domicilio (SHIP)')).toBeVisible()
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece cuando el estado no es READY_FOR_PICKUP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')
    const orderId = 604

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === `/v1/admin/orders/${orderId}`) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makePickupOrder(orderId, 'PREPARING', 'ONLINE_AT_ORDER', 'PAID')) })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Punto físico (PICKUP)')).toBeVisible()
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test('OPERATOR_CLIENT puede ver y usar PickupActions', async ({ page }) => {
    await setSession(page, 'OPERATOR_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'
    const orderId = 605

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()
      if (path === `/v1/admin/orders/${orderId}` && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makePickupOrder(orderId, status, 'ONLINE_AT_ORDER', 'PAID')) })
      } else if (path === `/v1/admin/orders/${orderId}/verify-pickup-identity`) {
        // No cambiar status: PickupActions sigue visible (condición READY_FOR_PICKUP)
        await route.fulfill({ status: 204 })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()

    await page.locator('#pickup-doc-number').click()
    await page.locator('#pickup-doc-number').type('3030303030')
    const btn = page.getByRole('button', { name: 'Verificar identidad' })
    await expect(btn).toBeEnabled()
    await btn.click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test('Error de identidad muestra mensaje de alerta inline', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')
    const orderId = 606

    await page.route('**/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()
      if (path === `/v1/admin/orders/${orderId}` && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(makePickupOrder(orderId, 'READY_FOR_PICKUP', 'ONLINE_AT_ORDER', 'PAID')) })
      } else if (path === `/v1/admin/orders/${orderId}/verify-pickup-identity`) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'INVALID_STATE_TRANSITION', message: 'Documento no coincide con el comprador del pedido.' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForLoadState('networkidle')

    await page.locator('#pickup-doc-number').click()
    await page.locator('#pickup-doc-number').type('9999999999')
    const btn = page.getByRole('button', { name: 'Verificar identidad' })
    await expect(btn).toBeEnabled()
    await btn.click()

    await expect(page.getByRole('alert').first()).toContainText('Documento no coincide con el comprador del pedido.')
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).toBeEnabled()
  })
})
