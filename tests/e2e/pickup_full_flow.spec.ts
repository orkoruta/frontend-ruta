import { expect, test, type Page, type Route } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Flujo PICKUP completo — E2E Suite (4.QA-1)
//
// Patrón: idéntico a ship_full_flow.spec.ts.
// - Sesión inyectada vía addInitScript (sessionStorage).
// - API mockeada vía page.route() — no requiere backend real para ejecutarse.
// - Requiere backend en :3001 + admin en :3002 para pasar en CI (webServer).
//
// Seed de referencia: infra-ruta/scripts/seed_dev_data.sh
//   admin.piloto@piloto.dev   → ADMIN_CLIENT  (slug: piloto-native)
//   operator.piloto@piloto.dev→ OPERATOR_CLIENT
//   password: Dev.Ruta.2026!
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
  return `**/v1${path}`
}

// ─── Helpers de datos de pedido ──────────────────────────────────────────────

type PaymentMethod = 'ONLINE_AT_ORDER' | 'ON_DELIVERY'
type OrderStatus = string

function makePickupOrder(
  id: number,
  status: OrderStatus,
  paymentMethod: PaymentMethod,
  paymentStatus: string,
) {
  return {
    id,
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

function makeShipOrder(id: number) {
  return {
    id,
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

    const getOrder = () => makePickupOrder(601, status, 'ONLINE_AT_ORDER', 'PAID')

    // Pedido base
    await page.route(apiRoute('/admin/orders/601'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    // Verificar identidad → AT_PICKUP_POINT (y luego CUSTOMER_ARRIVED_AT_PICKUP_POINT → IDENTITY_VALIDATED)
    // En el UI el operador solo pulsa "Verificar identidad" y el backend maneja la transición.
    // La acción lleva a AT_PICKUP_POINT + CUSTOMER_ARRIVED → IDENTITY_VALIDATED internamente;
    // la UI recarga el pedido vía onActionComplete(), que refetch. Simulamos que tras verificar
    // el backend devuelve estado IDENTITY_VALIDATED.
    await page.route(apiRoute('/admin/orders/601/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    // Marcar entregado (PICKED_UP → DELIVERED)
    await page.route(apiRoute('/admin/orders/601/mark-pickup-delivered'), async (route) => {
      status = 'DELIVERED'
      await route.fulfill({ status: 204 })
    })

    // ── Navegar a la página del pedido ────────────────────────────────────────
    await page.goto('/admin/orders/601')

    // Debe aparecer el bloque PickupActions (pedido PICKUP + READY_FOR_PICKUP)
    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Verificar identidad del comprador')).toBeVisible()

    // Ingresar número de documento
    await page.locator('#pickup-doc-number').fill('1010101010')

    // Pulsar "Verificar identidad"
    await page.getByRole('button', { name: 'Verificar identidad' }).click()

    // Confirmación de identidad verificada
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    // Pulsar "Marcar como entregado" (flujo sin COD)
    await page.getByRole('button', { name: 'Marcar como entregado' }).click()

    // Aparece diálogo de confirmación
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()

    // Confirmar entrega
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()

    // El estado debe haber cambiado — la badge mostrará "Entregado"
    // (el componente refetch después de la acción)
    await expect(page.getByText('Entregado')).toBeVisible()
  })

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test('Registrar cobro COD → Marcar entregado', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'
    let collectionDone = false

    const getOrder = () =>
      makePickupOrder(
        602,
        status,
        'ON_DELIVERY',
        collectionDone ? 'PAYMENT_COLLECTED' : 'PENDING_COLLECTION',
      )

    await page.route(apiRoute('/admin/orders/602'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    await page.route(apiRoute('/admin/orders/602/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    await page.route(apiRoute('/admin/orders/602/pickup-collection'), async (route) => {
      collectionDone = true
      status = 'PAYMENT_COLLECTED_CASH'
      await route.fulfill({ status: 204 })
    })

    await page.route(apiRoute('/admin/orders/602/mark-pickup-delivered'), async (route) => {
      status = 'DELIVERED'
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/602')

    // PickupActions debe estar visible con sección de cobro (isCod = true)
    await expect(page.getByText('Operación PICKUP')).toBeVisible()
    await expect(page.getByText('Registrar cobro (pago contra entrega)')).toBeVisible()

    // Verificar identidad primero
    await page.locator('#pickup-doc-number').fill('2020202020')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()

    // Registrar cobro
    await page.locator('#pickup-amount').fill('9000')
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    await expect(page.getByText('Cobro registrado correctamente.')).toBeVisible()

    // Marcar como entregado
    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('¿Confirmar entrega del pedido?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar entrega' }).click()
    await expect(page.getByText('Entregado')).toBeVisible()
  })

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece para pedidos SHIP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    await page.route(apiRoute('/admin/orders/603'), async (route) => {
      await fulfillJson(route, makeShipOrder(603))
    })

    await page.goto('/admin/orders/603')

    // La página debe cargar correctamente
    await expect(page.getByText('Punto físico (PICKUP)')).not.toBeVisible()
    await expect(page.getByText('Domicilio (SHIP)')).toBeVisible()

    // El bloque de PickupActions NO debe aparecer
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test('PickupActions NO aparece cuando el estado no es READY_FOR_PICKUP', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    // Pedido PICKUP pero en estado PREPARING (aún no READY_FOR_PICKUP)
    await page.route(apiRoute('/admin/orders/604'), async (route) => {
      await fulfillJson(
        route,
        makePickupOrder(604, 'PREPARING', 'ONLINE_AT_ORDER', 'PAID'),
      )
    })

    await page.goto('/admin/orders/604')

    // El tipo es PICKUP — aparece la etiqueta de punto físico
    await expect(page.getByText('Punto físico (PICKUP)')).toBeVisible()

    // Pero PickupActions NO se muestra (condición: status === READY_FOR_PICKUP)
    await expect(page.getByText('Operación PICKUP')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).not.toBeVisible()
  })

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  test('OPERATOR_CLIENT puede ver y usar PickupActions', async ({ page }) => {
    await setSession(page, 'OPERATOR_CLIENT')

    let status: OrderStatus = 'READY_FOR_PICKUP'

    const getOrder = () => makePickupOrder(605, status, 'ONLINE_AT_ORDER', 'PAID')

    await page.route(apiRoute('/admin/orders/605'), async (route) => {
      await fulfillJson(route, getOrder())
    })

    await page.route(apiRoute('/admin/orders/605/verify-pickup-identity'), async (route) => {
      status = 'IDENTITY_VALIDATED'
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/605')

    // El operador también ve PickupActions
    await expect(page.getByText('Operación PICKUP')).toBeVisible()

    // Puede verificar identidad
    await page.locator('#pickup-doc-number').fill('3030303030')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()
    await expect(page.getByText('Identidad verificada correctamente.')).toBeVisible()
  })

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  test('Error de identidad muestra mensaje de alerta inline', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    await page.route(apiRoute('/admin/orders/606'), async (route) => {
      await fulfillJson(route, makePickupOrder(606, 'READY_FOR_PICKUP', 'ONLINE_AT_ORDER', 'PAID'))
    })

    await page.route(apiRoute('/admin/orders/606/verify-pickup-identity'), async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'INVALID_STATE_TRANSITION',
          message: 'Documento no coincide con el comprador del pedido.',
        }),
      })
    })

    await page.goto('/admin/orders/606')

    await page.locator('#pickup-doc-number').fill('9999999999')
    await page.getByRole('button', { name: 'Verificar identidad' }).click()

    // El error de la API se muestra en el form como role=alert
    await expect(page.getByRole('alert').first()).toContainText(
      'Documento no coincide con el comprador del pedido.',
    )

    // El botón sigue habilitado para reintentar
    await expect(page.getByRole('button', { name: 'Verificar identidad' })).toBeEnabled()
  })
})
