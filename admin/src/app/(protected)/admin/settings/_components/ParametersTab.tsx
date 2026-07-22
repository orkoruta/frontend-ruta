'use client'

import { useEffect, useRef, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  getParameters,
  updateParameter,
  type ApiError,
  type Parameter,
} from '@/lib/parameters.api'

type SaveState = 'idle' | 'saving' | 'success' | 'error'

interface RowState {
  draft: string
  saveState: SaveState
  errorMsg: string | null
}

function groupParams(params: Parameter[]): Map<string, Parameter[]> {
  const map = new Map<string, Parameter[]>()
  for (const p of params) {
    const group = p.group || 'general'
    const existing = map.get(group)
    if (existing) {
      existing.push(p)
    } else {
      map.set(group, [p])
    }
  }
  return map
}

function formatGroupLabel(group: string): string {
  return group.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatParamKey(key: string): string {
  const parts = key.split('.')
  const last = parts[parts.length - 1] ?? key
  return last.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const INPUT_CLASS =
  'flex-1 rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

export function ParametersTab() {
  const [params, setParams] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getParameters()
        if (!active) return
        setParams(data)
        const initial: Record<string, RowState> = {}
        for (const p of data) {
          initial[p.parameter_key] = {
            draft: p.parameter_value,
            saveState: 'idle',
            errorMsg: null,
          }
        }
        setRowStates(initial)
      } catch (err) {
        if (!active) return
        const apiErr = err as ApiError
        setError(apiErr.message ?? 'No pudimos cargar los parámetros.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  function handleChange(key: string, value: string) {
    setRowStates((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, draft: value, saveState: 'idle', errorMsg: null },
    }))
  }

  async function handleSave(key: string) {
    const rowState = rowStates[key]
    if (!rowState) return

    setRowStates((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, saveState: 'saving', errorMsg: null },
    }))

    try {
      const updated = await updateParameter(key, rowState.draft)
      if (!mountedRef.current) return
      setParams((prev) =>
        prev.map((p) => (p.parameter_key === key ? updated : p)),
      )
      setRowStates((prev) => ({
        ...prev,
        [key]: { ...prev[key]!, saveState: 'success', errorMsg: null },
      }))
      setTimeout(() => {
        if (!mountedRef.current) return
        setRowStates((prev) => ({
          ...prev,
          [key]: { ...prev[key]!, saveState: 'idle' },
        }))
      }, 2000)
    } catch (err) {
      if (!mountedRef.current) return
      const apiErr = err as ApiError
      setRowStates((prev) => ({
        ...prev,
        [key]: {
          ...prev[key]!,
          saveState: 'error',
          errorMsg: apiErr.message ?? 'Error al guardar.',
        },
      }))
    }
  }

  if (loading) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Parámetros operativos" subtitle="configuración" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando parámetros…</p>
      </RutaCard>
    )
  }

  if (error) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Parámetros operativos" subtitle="configuración" />
        <p
          role="alert"
          className="rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      </RutaCard>
    )
  }

  if (params.length === 0) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Parámetros operativos" subtitle="configuración" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay parámetros configurados para este cliente.
        </p>
      </RutaCard>
    )
  }

  const grouped = groupParams(params)

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([group, groupParams]) => (
        <RutaCard key={group}>
          <RutaSectionHeader
            title={formatGroupLabel(group)}
            subtitle="parámetros"
          />

          <div className="flex flex-col gap-3">
            {groupParams.map((p) => {
              const row = rowStates[p.parameter_key]
              const isDirty = row?.draft !== p.parameter_value
              const isSaving = row?.saveState === 'saving'

              return (
                <div key={p.parameter_key} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {formatParamKey(p.parameter_key)}
                    </label>
                    {p.is_overrideable_by_client === false ? (
                      <span className="rounded border border-slate-200 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                        fijado por RUTA
                      </span>
                    ) : p.source === 'CLIENT' ? (
                      <span className="rounded border border-sky-400/25 bg-sky-500/[0.12] px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                        personalizado
                      </span>
                    ) : (
                      <span className="rounded border border-slate-200 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                        heredado
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      value={row?.draft ?? p.parameter_value}
                      onChange={(e) => handleChange(p.parameter_key, e.target.value)}
                      className={INPUT_CLASS}
                      disabled={isSaving || p.is_overrideable_by_client === false}
                    />
                    <RutaButton
                      type="button"
                      size="sm"
                      variant={row?.saveState === 'success' ? 'success' : 'primary'}
                      disabled={!isDirty || isSaving || p.is_overrideable_by_client === false}
                      onClick={() => void handleSave(p.parameter_key)}
                    >
                      {isSaving ? 'Guardando…' : row?.saveState === 'success' ? 'Guardado' : 'Guardar'}
                    </RutaButton>
                  </div>
                  {row?.saveState === 'error' && row.errorMsg && (
                    <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                      {row.errorMsg}
                    </p>
                  )}
                  {row?.saveState === 'success' && (
                    <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
                      Parámetro actualizado correctamente.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </RutaCard>
      ))}
    </div>
  )
}
