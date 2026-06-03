'use client'

import { useContext, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { SessionContext } from '@/lib/session-context'
import { listApiKeys, type ApiKey, type ApiKeysApiError } from '@/lib/api_keys.api'
import { ApiKeyTable } from './_components/ApiKeyTable'
import { CreateApiKeyDialog } from './_components/CreateApiKeyDialog'

export default function ApiKeysPage() {
  const session = useContext(SessionContext)

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const isAllowed =
    session?.user_type === 'ADMIN_CLIENT' ||
    session?.user_type === 'ADMIN_RUTA'

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const data = await listApiKeys()
      setApiKeys(data)
    } catch (err) {
      const apiErr = err as ApiKeysApiError
      setError(apiErr.message ?? 'No pudimos cargar las claves de API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAllowed) return
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed])

  if (!isAllowed) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Acceso restringido" subtitle="API Keys" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección.
        </p>
      </RutaCard>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            configuración
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            API Keys
          </h1>
        </div>
        <RutaButton
          type="button"
          variant="primary"
          className="mt-1"
          onClick={() => setShowCreate(true)}
        >
          + Nueva clave
        </RutaButton>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <RutaCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200/90 p-4 dark:border-white/10">
          <RutaSectionHeader
            title="Claves de API"
            subtitle={loading ? 'cargando…' : `${apiKeys.length} claves`}
            className="mb-0"
          />
        </div>

        {loading ? (
          <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Cargando claves de API…
          </div>
        ) : (
          <ApiKeyTable
            apiKeys={apiKeys}
            onRevoked={() => { void load() }}
          />
        )}
      </RutaCard>

      {showCreate && (
        <CreateApiKeyDialog
          onCreated={() => {
            setShowCreate(false)
            void load()
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
