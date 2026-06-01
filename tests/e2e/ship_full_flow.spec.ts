import { expect, test, type Page, type Route } from '@playwright/test'

const NOW = '2026-05-29T12:00:00.000Z'

type UserType = 'ADMIN_CLIENT' | 'COURIER'

async function setSession(page: Page, userType: UserType) {
  await page.addInitScript(({ type }) => {
    window.sessionStorage.setItem(
      'ruta_session',
      JSON.stringify({
        user_id: type === 'COURIER' ? 31 : 21,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001'

function apiRoute(path: string) {
  return `${API_BASE}${path}`
}

test.describe('Sprint 3 SHIP flow', () => {
  test('admin assigns a courier from /admin/orders/map', async ({ page }) => {
    await setSession(page, 'ADMIN_CLIENT')

    let assigned = false

    await page.route(apiRoute('/admin/orders/map'), async (route) => {
      await fulfillJson(route, {
        data: assigned
          ? []
          : [
              {
                id: 501,
                order_status: 'AWAITING_COURIER_ASSIGNMENT',
                delivery_address_line: 'Calle 93 #15-20',
                delivery_address_city: 'Bogota',
                latitude: 4.676,
                longitude: -74.048,
                buyer_id: 41,
                total: 125000,
                currency: 'COP',
                created_at: NOW,
              },
            ],
      })
    })

    await page.route(apiRoute('/admin/orders/501/available-couriers'), async (route) => {
      await fulfillJson(route, {
        data: [
          {
            id: 31,
            full_name: 'Carlos Courier',
            email: 'courier@example.test',
            phone: '+573001112233',
            status: 'ACTIVE',
          },
        ],
      })
    })

    await page.route(apiRoute('/admin/orders/501/assign-courier'), async (route) => {
      assigned = true
      await route.fulfill({ status: 204 })
    })

    await page.goto('/admin/orders/map')

    await expect(page.getByRole('heading', { name: /Mapa de asignaci.n/ })).toBeVisible()
    await page.getByRole('button', { name: /#501/ }).click()
    await expect(page.getByText('Carlos Courier')).toBeVisible()

    await page.getByRole('button', { name: 'Asignar' }).click()
    await expect(page.getByRole('dialog', { name: 'Asignar repartidor' })).toBeVisible()
    await page.getByRole('button', { name: /Confirmar asignaci.n/ }).click()

    await expect(page.getByText('Repartidor Carlos Courier asignado correctamente.')).toBeVisible()
    await expect(page.getByText(/No hay pedidos pendientes de asignaci.n./)).toBeVisible()
  })

  test('courier completes COD delivery from assigned to delivered', async ({ page }) => {
    await setSession(page, 'COURIER')

    let status = 'COURIER_ASSIGNED'
    let collectionRecorded = false

    const orderDetail = () => ({
      id: 501,
      order_status: status,
      delivery_address: 'Calle 93 #15-20, Bogota',
      buyer: {
        name: 'Ana Compradora',
        phone: '+573004445566',
      },
      items: [
        {
          id: 1,
          product_name: 'Producto demo',
          quantity: 1,
          unit_price: 125000,
          subtotal: 125000,
        },
      ],
      total: 125000,
      payment_method: 'ON_DELIVERY',
      collection_recorded: collectionRecorded,
      history: [
        {
          id: 1,
          to_state: status,
          created_at: NOW,
        },
      ],
      created_at: NOW,
    })

    await page.route(apiRoute('/courier/orders/501'), async (route) => {
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/501/start-shipping'), async (route) => {
      status = 'SHIPPED'
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/501/mark-out-for-delivery'), async (route) => {
      status = 'OUT_FOR_DELIVERY'
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/501/arrive'), async (route) => {
      status = 'ARRIVED_AT_CUSTOMER'
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/501/record-collection'), async (route) => {
      collectionRecorded = true
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/501/mark-delivered'), async (route) => {
      status = 'DELIVERED'
      await fulfillJson(route, orderDetail())
    })

    await page.goto('/courier/501')

    await page.getByRole('button', { name: 'Iniciar despacho' }).click()
    await expect(page.getByText(/Env.o iniciado./)).toBeVisible()

    await page.getByRole('button', { name: 'Marcar en camino al cliente' }).click()
    await expect(page.getByText('Marcado en camino.')).toBeVisible()

    await page.getByRole('button', { name: /Llegu. al cliente/ }).click()
    await expect(page.getByText('Registrar cobro')).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'recibo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    })
    await page.getByRole('button', { name: 'Confirmar cobro' }).click()
    await expect(page.getByText('Cobro registrado correctamente.')).toBeVisible()

    await page.getByRole('button', { name: 'Marcar como entregado' }).click()
    await expect(page.getByText('Pedido entregado.')).toBeVisible()
    await expect(page.getByText('Entregado').first()).toBeVisible()
  })

  test('courier records failed delivery attempt', async ({ page }) => {
    await setSession(page, 'COURIER')

    let status = 'OUT_FOR_DELIVERY'

    const orderDetail = () => ({
      id: 502,
      order_status: status,
      delivery_address: 'Carrera 7 #72-10, Bogota',
      buyer: {
        name: 'Luis Cliente',
        phone: '+573007778899',
      },
      items: [
        {
          id: 2,
          product_name: 'Producto alterno',
          quantity: 2,
          unit_price: 45000,
          subtotal: 90000,
        },
      ],
      total: 90000,
      payment_method: 'ONLINE_AT_ORDER',
      collection_recorded: false,
      history: [
        {
          id: 2,
          to_state: status,
          created_at: NOW,
        },
      ],
      created_at: NOW,
    })

    await page.route(apiRoute('/courier/orders/502'), async (route) => {
      await fulfillJson(route, orderDetail())
    })

    await page.route(apiRoute('/courier/orders/502/attempt-failed'), async (route) => {
      status = 'DELIVERY_ATTEMPTED'
      await fulfillJson(route, orderDetail())
    })

    await page.goto('/courier/502')

    await page.getByRole('button', { name: 'Registrar intento fallido' }).click()
    await page.getByPlaceholder(/cliente no respondi./).fill('Cliente no responde el telefono')
    await page.getByRole('button', { name: 'Confirmar' }).click()

    await expect(page.getByText('Intento de entrega registrado.')).toBeVisible()
    await expect(page.getByText('Intento fallido').first()).toBeVisible()
  })

  test('courier dashboard shows system-confirmed completed orders', async ({ page }) => {
    await setSession(page, 'COURIER')

    await page.route(apiRoute('/courier/orders/assigned'), async (route) => {
      await fulfillJson(route, {
        active: [
          {
            id: 503,
            order_status: 'CONFIRMED_BY_SYSTEM',
            delivery_address: 'Avenida Chile #10-10',
            buyer_name: 'Marta Cliente',
            buyer_phone: '+573009990000',
            total: 72000,
            payment_method: 'ONLINE_AT_ORDER',
            created_at: NOW,
          },
        ],
        completed_today: 1,
      })
    })

    await page.goto('/courier')

    await expect(page.getByText('Confirmado').first()).toBeVisible()
    await page.getByRole('button', { name: /Completados hoy/ }).click()
    await expect(page.getByText('entregas completadas hoy')).toBeVisible()
    await expect(page.getByText('1', { exact: true }).last()).toBeVisible()
  })
})
