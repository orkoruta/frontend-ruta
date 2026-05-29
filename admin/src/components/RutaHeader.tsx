'use client'

import { useContext } from 'react'
import { useRouter } from 'next/navigation'
import { RutaThemeToggle } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import { SESSION_KEY } from '@/lib/session'
import { logout } from '@/lib/auth.api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface RutaHeaderProps {
  onToggleSidebar: () => void
}

export function RutaHeader({ onToggleSidebar }: RutaHeaderProps) {
  const session = useContext(SessionContext)
  const router = useRouter()

  async function handleLogout() {
    try {
      await logout()
    } finally {
      sessionStorage.removeItem(SESSION_KEY)
      router.replace('/login')
    }
  }

  async function handleExitControlView() {
    try {
      await fetch(`${API_BASE}/auth/control-view/exit`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      sessionStorage.removeItem(SESSION_KEY)
      router.replace('/login')
    }
  }

  return (
    <div className="flex flex-col shrink-0">
      {/* Vista de Control amber banner */}
      {session?.acting_via_control_view && (
        <div className="flex items-center justify-between gap-4 bg-amber-500/[0.12] border-b border-amber-400/25 px-4 py-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            ⚠ Estás en Vista de Control del Cliente{' '}
            {session.client_id ? `#${session.client_id}` : ''}. Todas tus
            acciones quedan auditadas.
          </p>
          <button
            onClick={handleExitControlView}
            className="shrink-0 rounded-md border border-amber-400/30 bg-amber-500/[0.12] px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/[0.2] transition-colors"
          >
            Salir de Vista de Control
          </button>
        </div>
      )}

      {/* Main header bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white/[0.72] dark:bg-[#181a1e]/[0.78] backdrop-blur-sm px-4 gap-4">
        {/* Left: sidebar toggle + identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors lg:hidden"
            aria-label="Abrir navegación"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 4h14M2 9h14M2 14h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {session?.user_type === 'ADMIN_RUTA' ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
              RUTA admin
            </span>
          ) : session?.client_id ? (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Cliente #{session.client_id}
            </span>
          ) : null}
        </div>

        {/* Right: theme toggle + user menu */}
        <div className="flex items-center gap-2">
          <RutaThemeToggle />

          <div className="flex items-center gap-2 ml-2">
            <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
              #{session?.user_id}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-slate-200 dark:border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/[0.12] transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
    </div>
  )
}
