'use client'

import { useEffect, useState } from 'react'
import { RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { getParameters, type ApiError, type Parameter } from '@/lib/parameters.api'

const SENSITIVE_KEYS = ['private_key', 'events_secret', 'secret']

function isSensitive(key: string): boolean {
  return SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))
}

function formatKey(key: string): string {
  return key
    .replace(/^wompi\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function WompiTab() {
  const [params, setParams] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getParameters('wompi')
        if (active) setParams(data)
      } catch (err) {
        if (active) {
          const apiErr = err as ApiError
          setError(apiErr.message ?? 'No pudimos cargar la configuración de Wompi.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  return (
    <RutaCard>
      <RutaSectionHeader title="Pasarela de pagos Wompi" subtitle="configuración" />

      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando configuración…</p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {!loading && !error && params.length === 0 && (
        <div className="rounded-md border border-amber-400/25 bg-amber-500/[0.12] px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No hay configuración de Wompi registrada para este cliente. Contacta al equipo de RUTA
            para configurar tu integración de pagos.
          </p>
        </div>
      )}

      {!loading && params.length > 0 && (
        <dl className="grid gap-4 sm:grid-cols-2">
          {params.map((p) => (
            <div key={p.parameter_key}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {formatKey(p.parameter_key)}
              </dt>
              <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                {isSensitive(p.parameter_key) ? (
                  <span className="tracking-widest text-slate-400 dark:text-slate-500">
                    ••••••••
                  </span>
                ) : (
                  p.parameter_value || <span className="text-slate-400 dark:text-slate-500">—</span>
                )}
              </dd>
              {p.description && (
                <dd className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {p.description}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Los valores de claves privadas y secretos nunca se muestran en texto plano por seguridad.
        Para actualizar credenciales, contacta al equipo de RUTA.
      </p>
    </RutaCard>
  )
}
