import { expect, test } from '@playwright/test'
import { loginAs } from './helpers/auth.helper'

/**
 * Ajustes → Parámetros muestra nombres que entiende el Cliente, no las claves
 * internas, y separa lo que funciona de lo que aún no tiene efecto.
 */

const CORS = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:3002',
  'Access-Control-Allow-Credentials': 'true',
}
const PREFLIGHT = {
  ...CORS,
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Idempotency-Key',
}

const PARAMS = [
  {
    parameter_key: 'limits.max_concurrent_orders_per_courier',
    parameter_value: '3',
    value_type: 'INTEGER',
    description: 'Pedidos simultáneos por Repartidor',
    is_overrideable_by_client: true,
    source: 'GLOBAL',
  },
  {
    parameter_key: 'order.draft_expiration_minutes',
    parameter_value: '1440',
    value_type: 'INTEGER',
    description: 'Tiempo máximo en DRAFT antes de auto-cancelarse',
    is_overrideable_by_client: true,
    source: 'GLOBAL',
  },
  {
    parameter_key: 'notifications.sms_enabled',
    parameter_value: 'false',
    value_type: 'BOOLEAN',
    description: 'SMS habilitado',
    is_overrideable_by_client: true,
    source: 'GLOBAL',
  },
  {
    parameter_key: 'auth.max_failed_login_attempts',
    parameter_value: '5',
    value_type: 'INTEGER',
    description: 'Intentos fallidos antes de bloqueo',
    is_overrideable_by_client: false,
    source: 'GLOBAL',
  },
]

test('Parámetros: nombres claros, secciones y guardado', async ({ page }) => {
  await loginAs(page, 'ADMIN_CLIENT')

  let saved: { key: string; body: string } | null = null

  await page.route('http://127.0.0.1:3001/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: PREFLIGHT })
      return
    }
    if (url.pathname === '/admin/parameters' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(PARAMS) })
      return
    }
    if (url.pathname.startsWith('/admin/parameters/') && method !== 'GET') {
      const key = decodeURIComponent(url.pathname.split('/').pop()!)
      saved = { key, body: route.request().postData() ?? '' }
      const value = JSON.parse(route.request().postData() ?? '{}').value
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({ ...PARAMS[0], parameter_value: value, source: 'CLIENT' }),
      })
      return
    }
    // El resto de pestañas de Ajustes no importan aquí.
    await route.fulfill({ status: 404, contentType: 'application/json', headers: CORS, body: '{"code":"RESOURCE_NOT_FOUND","message":"no simulado"}' })
  })

  await page.goto('/admin/settings')
  await page.getByRole('button', { name: 'Parámetros' }).click()

  // Nombre de negocio, no la clave interna.
  await expect(page.getByText('Pedidos que puede llevar cada repartidor a la vez')).toBeVisible()
  await expect(page.getByText('Max Concurrent Orders Per Courier')).toHaveCount(0)
  await expect(page.getByText('Repartidores', { exact: true })).toBeVisible()

  // Unidad y equivalencia legible.
  await expect(page.getByText('= 1 día')).toBeVisible()

  // Lo que no tiene efecto y lo técnico va plegado.
  await expect(page.getByText(/Otros ajustes \(todavía sin efecto\)/)).toBeVisible()
  await expect(page.getByText('Notificaciones por SMS')).toBeHidden()
  await page.getByText(/Otros ajustes \(todavía sin efecto\)/).click()
  await expect(page.getByText('Notificaciones por SMS')).toBeVisible()
  await expect(page.getByLabel('Notificaciones por SMS')).toHaveValue('false')

  // Guardar sigue usando la clave interna.
  const input = page.getByLabel('Pedidos que puede llevar cada repartidor a la vez')
  await input.fill('10')
  await page.getByRole('button', { name: 'Guardar' }).first().click()
  await expect(page.getByText('Guardado. Aplica desde ya.')).toBeVisible()
  expect(saved).not.toBeNull()
  expect(saved!.key).toBe('limits.max_concurrent_orders_per_courier')
})
