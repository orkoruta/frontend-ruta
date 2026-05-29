import { expect, test, type Page, type Route } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Flujo PICKUP completo — E2E Suite (4.QA-1)
//
// Patrón: idéntico a ship_full_flow.spec.ts.
// - Sesión inyectada vía addInitScript (sessionStorage).
// - API mockeada vía page.route() — no requiere backend real para ejecutarse.
// - Todos los tests navegan a /admin/orders/_ (el único ID en generateStaticParams).
//   El componente usa useParams() para leer el ID y hace fetch de la orden,
//   que es interceptada por el mock de Playwright.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = '2026-05-29T12:00:00.000Z'

type UserType = 'ADMIN_CLIENT' | 'OPERATOR_CLIENT'

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

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

function apiRoute(path: string) {
  return `**${path}`
}

// ─── Helpers de datos de pedido ──────────────────────────────────────────────

type PaymentMethod = 'ONLINE_AT_ORDER' | 'ON_DELIVERY'
type OrderStatus = string

function makePickupOrder(
  status: OrderStatus,
  paymentMethod: PaymentMethod,
  paymentStatus: string,
) {
  return {
    id: '_',
    order_status: status,
    delivery_type: 'PICKUP',
    pickup_point_name: 'Sede Chapinero',
    payment_method: paymentMethod,
    buyer: {
      name: 'Ana Compradora',
      email: 'comprador1@piloto.dev',
      phone: '+573201001001',
    },
    courier: null,
    items: [
      {
        id: 1,
        product_name: 'Manzana Roja',
        product_sku: 'FRU-001',
        quantity: 2,
        unit_price: 4500,
        subtotal: 9000,
      },
    ],
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
    history: [
      {
        id: 1,
        to_state: status,
        reason: null,
        actor_role: 'ADMIN_CLIENT',
        created_at: NOW,
      },
    ],
    created_at: NOW,
  }
}

function makeShipOrder() {
  return {
    id: '_',
    order_status: 'READY_TO_SHIP',
    delivery_type: 'SHIP',
    delivery_address: 'Cll 72 #10-45 Oficina 301, Bogota',
    pickup_point_name: null,
    payment_method: 'ONLINE_AT_ORDER',
    buyer: {
      name: 'Juan Comprador',
      email: 'comprador2@piloto.dev',
      phone: '+573201001002',
    },
    courier: null,
    items: [
      {
        id: 2,
        product_name: 'Banano',
        product_sku: 'FRU-002',
        quantity: 1,
        unit_price: 3200,
        subtotal: 3200,
      },
    ],
    subtotal: 3200,
    shipping_fee: 5000,
    total: 8200,
    notes: null,
    payment: {
      status: 'PAID',
      method: 'ONLINE_AT_ORDER',
      amount: 8200,
      confirmed_at: NOW,
      evidence_url: null,
    },
    history: [
      {
        id: 10,
        to_state: 'READY_TO_SHIP',
        reason: null,
        actor_role: 'ADMIN_CLIENT',
        created_at: NOW,
      },
    ],
    created_at: NOW,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Flujo PICKUP completo', () => {
  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test('Verificar identidad → Marcar entregado (pedido prepagado online)', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'

    const getOrder = () => makePickupOrder(status, 'ONLINE_AT_ORDER', 'PAID')

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    await page.route(apiRoute('/admin/orders/_/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    await page.route(apiRoute('/admin/orders/_/mark-pickup-delivered'), async (route) => {
      status = 'DELIVERED'
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/_')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Verificar identidad del comprador')).toBeVisible()

    await page.locator('#pickup-doc-number').fill('1010101010')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()

    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()

    await expect(page.getByText('Entregado')).toBeVisible()
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test('Registrar cobro COD → Marcar entregado', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'
    let collectionDone = false

    const getOrder = () =>
      makePickupOrder(
        status,
        'ON_DELIVERY',
        collectionDone ? 'PAYMENT_COLLECTED' : 'PENDING_COLLECTION',
      )

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    await page.route(apiRoute('/admin/orders/_/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    await page.route(apiRoute('/admin/orders/_/pickup-collection'), async (route) => {
      collectionDone = true
      status = 'PAYMENT_COLLECTED_CASH'
      await route.fulfill({ status: 204 })
    })

    await page.route(apiRoute('/admin/orders/_/mark-pickup-delivered'), async (route) => {
      status = 'DELIVERED'
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/_')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Registrar cobro (pago contra entrega)')).toBeVisible()

    await page.locator('#pickup-doc-number').fill('2020202020')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    await page.locator('#pickup-amount').fill('9000')
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    await expect(page.getByText('Cobro registrado correctamente.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()
    await expect(page.getByText('Entregado')).toBeVisible()
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece para pedidos SHIP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, makeShipOrder())
    })

    await page.goto('/admin/orders/_')

    await expect(page.getByText('Punto físico (PICKUP)')).not.toBeVisible()
    await expect(page.getByText('Domicilio (SHIP)')).toBeVisible()
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece cuando el estado no es READY_FOR_PICKUP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, makePickupOrder('PREPARING', 'ONLINE_AT_ORDER', 'PAID'))
    })

    await page.goto('/admin/orders/_')

    await expect(page.getByText('Punto físico (PICKUP)')).toBeVisible()
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test('OPERATOR_CLIENT puede ver y usar PickupActions', async ({ page }) => {
    await setSession(page, 'OPERATOR_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'

    const getOrder = () => makePickupOrder(status, 'ONLINE_AT_ORDER', 'PAID')

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    await page.route(apiRoute('/admin/orders/_/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/_')

    await expect(page.getByText('Operación PICKUP')).toBeVisible()

    await page.locator('#pickup-doc-number').fill('3030303030')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test('Error de identidad muestra mensaje de alerta inline', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    await page.route(apiRoute('/admin/orders/_'), async (route) => {
      await fulfillJson(route, makePickupOrder('READY_FOR_PICKUP', 'ONLINE_AT_ORDER', 'PAID'))
    })

    await page.route(apiRoute('/admin/orders/_/verify-pickup-identity'), async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Documento no coincide con el comprador del pedido.',
        }),
      })
    })

    await page.goto('/admin/orders/_')

    await page.locator('#pickup-doc-number').fill('9999999999')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()

    await expect(page.getByRole('alert').first()).toContainText(
      'Documento no coincide con el comprador del pedido.',
    )

    await expect(page.getByRole('button', { name: 'Verificar identidad' })).toBeEnabled()
  })
})
