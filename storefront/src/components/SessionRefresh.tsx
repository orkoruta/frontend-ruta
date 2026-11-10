'use client'

import { installSessionRefresh } from '@orkoruta/web-shared'

/*
 * Se instala al **evaluar el módulo**, no en un efecto: React corre los
 * efectos de los hijos antes que los del padre, así que desde un `useEffect`
 * aquí las primeras peticiones de la página saldrían sin renovación.
 * Ver `packages/web-shared/src/session_refresh.ts`.
 */
if (typeof window !== 'undefined') {
  installSessionRefresh(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
}

export function SessionRefresh() {
  return null
}
