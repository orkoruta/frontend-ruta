'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RutaButton, RutaCard, RutaPasswordInput } from '@orkoruta/ui'
import { registerBuyer } from '@/lib/auth.api'
import { useStore } from '@/lib/store-context'

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
]

const inputClass =
  'w-full rounded-md border px-3 py-2 text-sm ' +
  'bg-white/[0.85] border-slate-200 text-slate-900 ' +
  'dark:bg-white/[0.055] dark:border-white/10 dark:text-slate-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-sky-500/[0.4]'

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

export function RegisterForm() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const { refresh } = useStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [documentType, setDocumentType] = useState('CC')
  const [documentNumber, setDocumentNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerBuyer({
        client_slug: slug,
        email,
        password,
        full_name: fullName,
        phone,
        document_type: documentType,
        document_number: documentNumber,
      })
      // El registro deja sesión iniciada (cookies); refrescar el contexto para
      // que el header salude por nombre al volver al catálogo.
      await refresh()
      router.push(`/c/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-[#111214] p-4">
      <div className="w-full max-w-[480px]">
        <RutaCard className="p-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
            Crear cuenta
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Nombre completo
              </label>
              <input
                id="full_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
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
              <RutaPasswordInput
                id="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="document_type" className={labelClass}>
                  Tipo de documento
                </label>
                <select
                  id="document_type"
                  required
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={inputClass}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="document_number" className={labelClass}>
                  Número
                </label>
                <input
                  id="document_number"
                  type="text"
                  required
                  placeholder="1010101010"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+57 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </RutaButton>
          </form>
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href={`/c/${slug}/login`}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Iniciar sesión
            </Link>
          </div>
        </RutaCard>
      </div>
    </div>
  )
}
