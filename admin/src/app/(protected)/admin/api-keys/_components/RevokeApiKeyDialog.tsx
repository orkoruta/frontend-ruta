'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import { revokeApiKey, type ApiKey, type ApiKeysApiError } from '@/lib/api_keys.api'

interface RevokeApiKeyDialogProps {
  apiKey: ApiKey
  onRevoked: () => void
  onClose: () => void
}

export function RevokeApiKeyDialog({ apiKey, onRevoked, onClose }: RevokeApiKeyDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRevoke() {
    setLoading(true)
    setError(null)

    try {
      await revokeApiKey(apiKey.key_id)
      onRevoked()
    } catch (err) {
      const apiErr = err as ApiKeysApiError
      setError(apiErr.message ?? 'No pudimos revocar la clave.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/[0.5]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#17191d] p-6 shadow-2xl">
        <h2
          id="revoke-dialog-title"
          className="text-base font-bold text-slate-100"
        >
          Revocar clave de API
        </h2>

        <p className="mt-3 text-sm text-slate-400">
          ¿Revocar la clave{' '}
          <span className="font-semibold text-slate-100">{apiKey.name}</span>?
          Esta acción es irreversible. Las solicitudes autenticadas con esta
          clave dejarán de funcionar inmediatamente.
        </p>

        <p className="mt-2 font-mono text-xs text-slate-500">{apiKey.key_id}</p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-xs text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <RutaButton
            type="button"
            variant="neutral"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </RutaButton>
          <RutaButton
            type="button"
            variant="danger"
            disabled={loading}
            onClick={() => { void handleRevoke() }}
          >
            {loading ? 'Revocando…' : 'Revocar'}
          </RutaButton>
        </div>
      </div>
    </div>
  )
}
