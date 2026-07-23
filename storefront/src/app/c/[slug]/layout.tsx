'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getClientBySlug, type ClientPublicInfo } from '@/lib/catalog.api'
import { logoutBuyer } from '@/lib/auth.api'
import { StoreProvider, useStore } from '@/lib/store-context'

/** Primer nombre, para un saludo más corto y cálido. */
function firstName(fullName: string | null): string {
  if (!fullName) return ''
  return fullName.trim().split(/\s+/)[0] ?? ''
}

function HeaderActions({ slug }: { slug: string }) {
  const router = useRouter()
  const { profile, loadingSession, cartCount, clearSession } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    try {
      await logoutBuyer()
    } catch {
      // Best-effort: igual se limpia el estado local.
    } finally {
      clearSession()
      router.push(`/c/${slug}`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Carrito: siempre visible, con contador. */}
      <Link
        href={`/c/${slug}/cart`}
        aria-label={`Carrito (${cartCount} ${cartCount === 1 ? 'ítem' : 'ítems'})`}
        className="relative inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white/[0.85] px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.08]"
      >
        <span aria-hidden="true">🛒</span>
        <span className="hidden sm:inline">Carrito</span>
        {cartCount > 0 && (
          <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-sky-600 px-1.5 text-[11px] font-bold leading-5 text-white">
            {cartCount}
          </span>
        )}
      </Link>

      {loadingSession ? (
        // Placeholder para que el header no salte al resolver la sesión.
        <div className="h-9 w-24 animate-pulse rounded-md bg-slate-200/70 dark:bg-white/[0.06]" />
      ) : profile && !profile.is_guest ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white/[0.85] px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.08]"
          >
            {firstName(profile.full_name) ? (
              <>
                <span className="hidden sm:inline">Hola,&nbsp;</span>
                <span className="font-semibold">{firstName(profile.full_name)}</span>
              </>
            ) : (
              <span className="font-semibold">Mi cuenta</span>
            )}
            <span aria-hidden="true" className="text-[10px]">▾</span>
          </button>

          {menuOpen && (
            <>
              {/* Capa para cerrar el menú al hacer clic fuera. */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1d2025]">
                <Link
                  href={`/c/${slug}/orders`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  Mis pedidos
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="block w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-slate-50 dark:text-rose-400 dark:hover:bg-white/[0.06]"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        // Invitado o sin sesión: puede iniciar sesión / crear cuenta. Al invitado
        // NO se le muestra "Mis pedidos" (no tiene cuenta que guarde su historial).
        <Link
          href={`/c/${slug}/login`}
          className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white/[0.85] px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.08]"
        >
          Iniciar sesión
        </Link>
      )}
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  const pathname = usePathname()
  // En login/registro no tiene sentido el botón "Iniciar sesión" (apuntaría a la
  // misma página) ni el carrito: se ocultan las acciones del header.
  const isAuthPage = /\/(login|register)(\/|$)/.test(pathname ?? '')
  const [clientInfo, setClientInfo] = useState<ClientPublicInfo | null>(null)

  useEffect(() => {
    if (!slug) return
    getClientBySlug(slug)
      .then(setClientInfo)
      .catch(() => setClientInfo(null))
  }, [slug])

  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col bg-[#f3f4f6] text-slate-950 dark:bg-[#111214] dark:text-slate-100">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/[0.76] backdrop-blur-sm dark:border-white/10 dark:bg-[#181a1e]/[0.78]">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link
              href={`/c/${slug}`}
              className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {clientInfo?.logo_url ? (
                <Image
                  src={clientInfo.logo_url}
                  alt={clientInfo.name}
                  width={120}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <span className="text-base font-black tracking-tight">
                  {clientInfo?.name ?? ' '}
                </span>
              )}
            </Link>

            {!isAuthPage && <HeaderActions slug={slug} />}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white/[0.76] py-6 dark:border-white/10 dark:bg-[#181a1e]/[0.78]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              {clientInfo && (
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {clientInfo.name}
                </p>
              )}
              <p className="text-[10px] tracking-wide text-slate-400 dark:text-slate-600">
                Powered by RUTA
              </p>
            </div>
          </div>
        </footer>
      </div>
    </StoreProvider>
  )
}
