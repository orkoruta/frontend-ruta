'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RutaCard, RutaButton, RutaSectionHeader, RutaPasswordInput, RutaLogo, RutaRouteBackdrop } from '@orkoruta/ui'
import { loginClient, loginRutaAdmin, type ApiError } from '@/lib/auth.api'
import { SESSION_KEY, type RutaSession } from '@/lib/session'

const REDIRECT: Record<string, string> = {
  ADMIN_RUTA: '/ruta-admin/dashboard',
  ADMIN_CLIENT: '/admin/dashboard',
  OPERATOR_CLIENT: '/admin/dashboard',
  COURIER: '/courier',
  BUYER: '/admin/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientSlug, setClientSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  /*
   * `?expired=1` lo pone el layout protegido al recibir un 401. Sin este aviso
   * el usuario aparece de golpe en el login sin saber por qué y cree que ha
   * perdido lo que estaba haciendo.
   *
   * Se lee de `window.location` y no con `useSearchParams` para no obligar a
   * envolver la página en un `<Suspense>`, que es lo único que aporta aquí.
   */
  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expired') === '1')
  }, [])

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const session = JSON.parse(stored) as RutaSession
        router.replace(REDIRECT[session.user_type] ?? '/admin/orders')
      }
    } catch {
      // sessionStorage not available or invalid; proceed to login
    }
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = clientSlug.trim()
        ? await loginClient(email.trim(), password, clientSlug.trim())
        : await loginRutaAdmin(email.trim(), password)

      const session: RutaSession = {
        user_id: data.user_id,
        client_id: data.client_id,
        client_slug: clientSlug.trim() || undefined,
        client_type: data.client_type,
        user_type: data.user_type,
        acting_via_control_view: data.acting_via_control_view ?? false,
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      router.replace(REDIRECT[data.user_type] ?? '/admin/orders')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr?.message ?? 'Error al iniciar sesión. Verifique sus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative isolate min-h-screen flex items-center justify-center overflow-hidden p-4">
      {/* La ruta de la marca como atmósfera. Ver `RutaRouteBackdrop`. */}
      <RutaRouteBackdrop variant="flow" />

      <div className="u-in-pop w-full max-w-[480px]">
        {/* Sin barra lateral, esta es la única marca de la pantalla: el logo
            va a tamaño real en vez del rótulo de texto que había antes. */}
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Dimensionado por ancho: el logo es muy apaisado (1.82:1) y
              fijarle la altura lo deja demasiado pequeño para que se lea
              "by ORKO". */}
          <RutaLogo className="h-auto w-40 text-brand-500" />
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Panel administrativo
          </h1>
        </div>

        <RutaCard>
          <RutaSectionHeader title="Iniciar sesión" subtitle="acceso" />

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full rounded-md border bg-white/[0.85] border-slate-200 dark:bg-white/[0.055] dark:border-white/10 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Contraseña
              </label>
              <RutaPasswordInput
                id="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border bg-white/[0.85] border-slate-200 dark:bg-white/[0.055] dark:border-white/10 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="clientSlug"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                {/*
                  Decía «opcional». No lo es: si se deja vacío, el login va a
                  `/auth/ruta-admin/login` e intenta autenticar como equipo
                  RUTA. Un Cliente, un operador o un repartidor que lo dejara
                  en blanco no entraba y no había forma de saber por qué.
                */}
                Código de empresa{' '}
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  (obligatorio, salvo si eres del equipo RUTA)
                </span>
              </label>
              <input
                id="clientSlug"
                type="text"
                autoComplete="off"
                value={clientSlug}
                onChange={(e) => setClientSlug(e.target.value)}
                placeholder="ej. restaurante-el-prado"
                className="w-full rounded-md border bg-white/[0.85] border-slate-200 dark:bg-white/[0.055] dark:border-white/10 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              />
            </div>

            {expired && !error && (
              <p
                role="status"
                className="rounded-md border border-amber-400/25 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
              >
                Tu sesión caducó. Vuelve a entrar para continuar.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            <RutaButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full justify-center"
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </RutaButton>
          </form>
        </RutaCard>
      </div>
    </main>
  )
}
