'use client'

import { useState } from 'react'
import { RutaButton } from '@orkoruta/ui'
import { type ApiKey } from '@/lib/api_keys.api'
import { RevokeApiKeyDialog } from './RevokeApiKeyDialog'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

type StatusColor = 'green' | 'red' | 'slate'

function statusColor(status: ApiKey['status']): StatusColor {
  if (status === 'ACTIVE') return 'green'
  if (status === 'REVOKED') return 'red'
  return 'slate'
}

const STATUS_CLASSES: Record<StatusColor, string> = {
  green: 'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  red: 'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
  slate: 'bg-white/[0.06] text-slate-600 border-white/10 dark:text-slate-300',
}

const STATUS_LABELS: Record<ApiKey['status'], string> = {
  ACTIVE: 'Activa',
  REVOKED: 'Revocada',
  EXPIRED: 'Expirada',
}

interface ApiKeyTableProps {
  apiKeys: ApiKey[]
  onRevoked: () => void
}

export function ApiKeyTable({ apiKeys, onRevoked }: ApiKeyTableProps) {
  const [revoking, setRevoking] = useState<ApiKey | null>(null)

  if (apiKeys.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
        No hay claves de API creadas.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/90 text-sm dark:divide-white/10">
          <thead className="bg-slate-50/[0.7] dark:bg-white/[0.035]">
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Key ID</th>
              <th className="px-4 py-3">Scopes</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último uso</th>
              <th className="px-4 py-3">Expira</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {apiKeys.map((key) => {
              const color = statusColor(key.status)
              return (
                <tr
                  key={key.key_id}
                  className="text-slate-700 hover:bg-slate-50/[0.5] dark:text-slate-300 dark:hover:bg-white/[0.025]"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {key.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {key.key_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-flex items-center rounded border border-violet-400/25 bg-violet-500/[0.1] px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                        STATUS_CLASSES[color],
                      ].join(' ')}
                    >
                      {STATUS_LABELS[key.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(key.last_used_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(key.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {key.status === 'ACTIVE' && (
                      <RutaButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setRevoking(key)}
                      >
                        Revocar
                      </RutaButton>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {revoking && (
        <RevokeApiKeyDialog
          apiKey={revoking}
          onRevoked={() => {
            setRevoking(null)
            onRevoked()
          }}
          onClose={() => setRevoking(null)}
        />
      )}
    </>
  )
}
