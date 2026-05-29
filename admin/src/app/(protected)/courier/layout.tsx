'use client'

import { useContext, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SessionContext } from '@/lib/session-context'
import { SESSION_KEY } from '@/lib/session'

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const session = useContext(SessionContext)
  const router = useRouter()

  useEffect(() => {
    if (session && session.user_type !== 'COURIER') {
      router.replace('/login')
    }
  }, [session, router])

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    router.replace('/login')
  }

  if (!session) return null

  if (session.user_type !== 'COURIER') return null

  return (
    // Fixed overlay — the admin sidebar from the parent (protected) layout is hidden behind this.
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-[#f3f4f6] dark:bg-[#111214]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/90 bg-white/[0.76] px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#1d2025]/[0.78]">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            RUTA
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            — Hola, repartidor
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-200 bg-white/[0.06] px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-300"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  )
}
