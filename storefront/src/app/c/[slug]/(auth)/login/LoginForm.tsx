'use client'

import { Suspense, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RutaButton, RutaCard } from '@orkoruta/ui'
import { loginBuyer } from '@/lib/auth.api'

const inputClass =
  'w-full rounded-md border px-3 py-2 text-sm ' +
  'bg-white/[0.85] border-slate-200 text-slate-900 ' +
  'dark:bg-white/[0.055] dark:border-white/10 dark:text-slate-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4]'

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

function LoginFormContent() {
  const params = useParams()
  const slug = params.slug as string
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('return') ?? `/c/${slug}`
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginBuyer({ client_slug: slug, email, password })
      router.push(returnUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#111214] p-4">
      <div className="w-full max-w-[480px]">
        <RutaCard className="p-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
            Iniciar sesión
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className={labelClass}>
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {error !== null && (
              <p
                role="alert"
                className="text-sm text-rose-700 dark:text-rose-400 bg-rose-500/[0.1] border border-rose-400/40 rounded-md px-3 py-2"
              >
                {error}
              </p>
            )}
            <RutaButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center mt-2"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </RutaButton>
          </form>
          <div className="mt-6 space-y-2 text-sm">
            <p className="text-slate-400 dark:text-slate-500">
              ¿Olvidaste tu contraseña?{' '}
              <span className="text-slate-300 dark:text-slate-600" title="Próximamente disponible">
                Recuperar contraseña
              </span>
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              ¿No tienes cuenta?{' '}
              <Link
                href={`/c/${slug}/register`}
                className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
              >
                Crear cuenta
              </Link>
            </p>
          </div>
        </RutaCard>
      </div>
    </div>
  )
}

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormContent />
    </Suspense>
  )
}
