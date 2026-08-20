'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RutaSidebar } from '@/components/RutaSidebar'
import { RutaHeader } from '@/components/RutaHeader'
import { SessionContext } from '@/lib/session-context'
import { onUnauthorized } from '@/lib/session-events'
import { SESSION_KEY, type RutaSession } from '@/lib/session'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<RutaSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) {
        router.replace('/login')
        return
      }
      const parsed = JSON.parse(raw) as RutaSession
      setSession(parsed)
    } catch {
      router.replace('/login')
    } finally {
      setChecked(true)
    }
  }, [router])

  /*
   * Token caducado. Antes no lo manejaba nadie: las pantallas se quedaban
   * vacías o soltaban errores sueltos y el usuario no tenía forma de saber que
   * lo que pasaba es que había que volver a entrar. En el mapa de asignación,
   * que recarga cada 30 s, era una ráfaga de 401 en consola y nada en pantalla.
   *
   * Se limpia la sesión guardada antes de redirigir: si no, el efecto de
   * arriba la volvería a leer al montar el login y daría vueltas.
   */
  const handleUnauthorized = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // sessionStorage no disponible; la redirección sigue siendo lo correcto.
    }
    setSession(null)
    router.replace('/login?expired=1')
  }, [router])

  useEffect(() => onUnauthorized(handleUnauthorized), [handleUnauthorized])

  if (!checked || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-sm text-slate-400">Cargando…</span>
      </div>
    )
  }

  return (
    <SessionContext.Provider value={session}>
      <div className="flex h-screen overflow-hidden">
        <RutaSidebar
          collapsed={!sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <RutaHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  )
}
