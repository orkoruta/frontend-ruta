'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RutaSidebar } from '@/components/RutaSidebar'
import { RutaHeader } from '@/components/RutaHeader'
import { SessionContext } from '@/lib/session-context'
import { SESSION_KEY, type RutaSession } from '@/lib/session'

export { SESSION_KEY, type RutaSession } from '@/lib/session'
export { SessionContext } from '@/lib/session-context'

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
