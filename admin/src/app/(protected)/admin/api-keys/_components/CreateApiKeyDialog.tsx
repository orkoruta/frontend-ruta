'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import {
  createApiKey,
  type ApiKeysApiError,
  type CreateApiKeyResult,
} from '@/lib/api_keys.api'

const AVAILABLE_SCOPES: Array<{ value: string; label: string }> = [
  { value: 'orders:read', label: 'Leer pedidos (orders:read)' },
  { value: 'orders:write', label: 'Crear pedidos (orders:write)' },
]

interface CreateApiKeyDialogProps {
  onCreated: () => void
  onClose: () => void
}

export function CreateApiKeyDialog({ onCreated, onClose }: CreateApiKeyDialogProps) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['orders:read'])
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreateApiKeyResult | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (scopes.length === 0) {
      setError('Selecciona al menos un scope.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await createApiKey({
        name: name.trim(),
        scopes,
        expires_at: expiresAt || undefined,
      })
      setCreated(result)
    } catch (err) {
      const apiErr = err as ApiKeysApiError
      setError(apiErr.message ?? 'No pudimos crear la clave.')
    } finally {
      setLoading(false)
    }
  }

  async function copySecret() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may not be available in some environments
    }
  }

  function handleClose() {
    if (created) onCreated()
    else onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/[0.5]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#17191d] p-6 shadow-2xl">
        <h2
          id="create-dialog-title"
          className="text-base font-bold text-slate-100"
        >
          {created ? 'Clave creada' : 'Nueva clave de API'}
        </h2>

        {!created ? (
          <form onSubmit={(e) => { void handleSubmit(e) }} className="mt-4 flex flex-col gap-4">
            {/* Nombre */}
            <div>
              <label
                htmlFor="key-name"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Nombre
              </label>
              <input
                id="key-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi integración"
                disabled={loading}
                className="w-full rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50"
              />
            </div>

            {/* Scopes */}
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-slate-400">
                Permisos (scopes)
              </legend>
              <div className="flex flex-col gap-2">
                {AVAILABLE_SCOPES.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={scopes.includes(value)}
                      onChange={() => toggleScope(value)}
                      disabled={loading}
                      className="accent-sky-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Expiración */}
            <div>
              <label
                htmlFor="expires-at"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Fecha de expiración{' '}
                <span className="text-slate-500">(opcional)</span>
              </label>
              <input
                id="expires-at"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-300"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2 justify-end border-t border-white/10 pt-4">
              <RutaButton type="button" variant="neutral" disabled={loading} onClick={onClose}>
                Cancelar
              </RutaButton>
              <RutaButton type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creando…' : 'Crear clave'}
              </RutaButton>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {/* Warning */}
            <div className="rounded-md border border-amber-400/25 bg-amber-500/[0.1] px-4 py-3">
              <p className="text-xs font-semibold text-amber-300">
                Este secreto no podrá recuperarse. Guárdalo ahora.
              </p>
              <p className="mt-1 text-xs text-amber-400">
                Al cerrar este diálogo el secreto desaparecerá permanentemente.
              </p>
            </div>

            {/* Secret */}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">
                Secreto de la clave
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={created.secret}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-slate-100 focus:outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <RutaButton
                  type="button"
                  variant={copied ? 'success' : 'neutral'}
                  onClick={() => { void copySecret() }}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </RutaButton>
              </div>
            </div>

            {/* Key info */}
            <dl className="grid gap-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <dt>Nombre</dt>
                <dd className="text-slate-200">{created.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Key ID</dt>
                <dd className="font-mono text-slate-200">{created.key_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Scopes</dt>
                <dd className="text-slate-200">{created.scopes.join(', ')}</dd>
              </div>
            </dl>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <RutaButton type="button" variant="primary" onClick={handleClose}>
                Entendido, cerrar
              </RutaButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
