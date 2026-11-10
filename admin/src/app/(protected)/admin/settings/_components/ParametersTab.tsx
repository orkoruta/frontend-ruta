'use client'

import { useEffect, useRef, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  getParameters,
  updateParameter,
  type ApiError,
  type Parameter,
} from '@/lib/parameters.api'
import {
  SECTION_LABELS,
  SECTION_ORDER,
  humanizeDuration,
  parameterInfo,
  type ParameterInfo,
  type ParameterSection,
} from '@/lib/parameter_catalog'

type SaveState = 'idle' | 'saving' | 'success' | 'error'

interface RowState {
  draft: string
  saveState: SaveState
  errorMsg: string | null
}

/**
 * Agrupa por sección del catálogo (`lib/parameter_catalog.ts`), no por el
 * prefijo de la clave: el Cliente piensa en «Repartidores» o «Pedidos», no en
 * `limits.*` u `order.*`. Dentro de cada sección, los que el Cliente ya
 * personalizó van primero.
 */
interface CatalogedParameter {
  param: Parameter
  info: ParameterInfo
}

function groupBySection(params: Parameter[]): Map<ParameterSection, CatalogedParameter[]> {
  const map = new Map<ParameterSection, CatalogedParameter[]>()
  for (const param of params) {
    const info = parameterInfo(param.parameter_key, param.is_overrideable_by_client === false)
    const list = map.get(info.section) ?? []
    list.push({ param, info })
    map.set(info.section, list)
  }
  return new Map(
    SECTION_ORDER.filter((s) => map.has(s)).map((s) => [s, map.get(s)!] as const),
  )
}

/** Secciones que se muestran plegadas: no tienen efecto o no son del Cliente. */
const COLLAPSED_SECTIONS: ReadonlySet<ParameterSection> = new Set(['inactive', 'technical'])

const INPUT_CLASS =
  'flex-1 rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

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

  const grouped = groupBySection(params)

  function renderRow({ param: p, info }: CatalogedParameter) {
    const row = rowStates[p.parameter_key]
    const isDirty = row?.draft !== p.parameter_value
    const isSaving = row?.saveState === 'saving'
    const fixed = p.is_overrideable_by_client === false
    const draft = row?.draft ?? p.parameter_value
    const isBoolean = p.value_type === 'BOOLEAN' || draft === 'true' || draft === 'false'
    const hint = humanizeDuration(draft, info.unit)

    return (
      <div key={p.parameter_key} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`param-${p.parameter_key}`}
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {info.label}
          </label>
          {fixed ? (
            <span className="rounded border border-slate-200 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
              lo administra RUTA
            </span>
          ) : p.source === 'CLIENT' ? (
            <span className="rounded border border-brand-400/25 bg-brand-500/[0.12] px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-300">
              valor tuyo
            </span>
          ) : (
            <span className="rounded border border-slate-200 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
              valor por defecto
            </span>
          )}
        </div>
        {(info.help || p.description) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{info.help || p.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isBoolean ? (
            <select
              id={`param-${p.parameter_key}`}
              value={draft}
              onChange={(e) => handleChange(p.parameter_key, e.target.value)}
              className={INPUT_CLASS + ' max-w-[10rem]'}
              disabled={isSaving || fixed}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              id={`param-${p.parameter_key}`}
              value={draft}
              inputMode={p.value_type === 'INTEGER' || p.value_type === 'DECIMAL' ? 'decimal' : undefined}
              onChange={(e) => handleChange(p.parameter_key, e.target.value)}
              className={INPUT_CLASS + ' max-w-[12rem]'}
              disabled={isSaving || fixed}
            />
          )}
          {info.unit && (
            <span className="text-sm text-slate-600 dark:text-slate-300">{info.unit}</span>
          )}
          {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
          {!fixed && (
            <RutaButton
              type="button"
              size="sm"
              variant={row?.saveState === 'success' ? 'success' : 'primary'}
              disabled={!isDirty || isSaving}
              onClick={() => void handleSave(p.parameter_key)}
            >
              {isSaving ? 'Guardando…' : row?.saveState === 'success' ? 'Guardado' : 'Guardar'}
            </RutaButton>
          )}
        </div>
        {row?.saveState === 'error' && row.errorMsg && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {row.errorMsg}
          </p>
        )}
        {row?.saveState === 'success' && (
          <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
            Guardado. Aplica desde ya.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(grouped.entries()).map(([section, items]) => {
        const labels = SECTION_LABELS[section]
        const rows = <div className="flex flex-col gap-5">{items.map(renderRow)}</div>

        if (COLLAPSED_SECTIONS.has(section)) {
          return (
            <RutaCard key={section}>
              <details>
                <summary className="cursor-pointer select-none text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {labels.title}{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    ({items.length}) — {labels.subtitle}
                  </span>
                </summary>
                <p className="mb-4 mt-2 rounded-md border border-amber-400/30 bg-amber-500/[0.1] px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {section === 'inactive'
                    ? 'Estos ajustes todavía no cambian nada en el sistema: están reservados para funciones que vienen. Puedes dejarlos como están.'
                    : 'Ajustes internos de la plataforma. No se pueden cambiar desde aquí.'}
                </p>
                {rows}
              </details>
            </RutaCard>
          )
        }

        return (
          <RutaCard key={section}>
            <RutaSectionHeader title={labels.title} subtitle={labels.subtitle} />
            {rows}
          </RutaCard>
        )
      })}
    </div>
  )
}
