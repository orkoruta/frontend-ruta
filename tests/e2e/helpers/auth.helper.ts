/**
 * auth.helper.ts — 6.QA-1
 *
 * Reutilizable: simula sesión autenticada para cualquier rol vía sessionStorage
 * (mismo patrón que ship_full_flow.spec.ts y pickup_full_flow.spec.ts).
 */

import { type Page } from '@playwright/test'

export type RutaRole = 'ADMIN_CLIENT' | 'ADMIN_RUTA' | 'COURIER' | 'BUYER' | 'OPERATOR_CLIENT'

const USER_IDS: Record<RutaRole, number> = {
  ADMIN_RUTA: 1,
  ADMIN_CLIENT: 21,
  OPERATOR_CLIENT: 22,
  COURIER: 31,
  BUYER: 41,
}

/**
 * loginAs — instala una sesión en sessionStorage antes de que cargue la página.
 *
 * @param page  Playwright Page
 * @param role  Rol a simular
 * @param slug  No se usa actualmente (reservado para futuras variantes de tenant)
 */
export async function loginAs(page: Page, role: RutaRole, _slug?: string): Promise<void> {
  await page.addInitScript(({ userId, userType }) => {
    window.sessionStorage.setItem(
      'ruta_session',
      JSON.stringify({
        user_id: userId,
        client_id: userType === 'ADMIN_RUTA' ? 0 : 1,
        user_type: userType,
        acting_via_control_view: false,
      }),
    )
  }, { userId: USER_IDS[role], userType: role })
}

/**
 * logout — limpia la sesión de sessionStorage.
 * Útil para tests que verifican comportamiento post-logout.
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.sessionStorage.removeItem('ruta_session')
  })
}
