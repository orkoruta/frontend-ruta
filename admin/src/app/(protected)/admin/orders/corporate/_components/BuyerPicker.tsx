'use client'

import { useEffect, useRef, useState } from 'react'
import { listBuyers, type Buyer } from '@/lib/users.api'

/**
 * Selector de comprador con buscador.
 *
 * Antes era un `<select>` con los primeros 100 compradores: no se podía
 * escribir para buscar, y a partir del comprador 101 los demás no aparecían
 * en la lista. Ahora busca en el servidor por nombre, correo o celular mientras
 * se escribe, sin tope.
 *
 * También permite registrar un comprador nuevo en el momento (nombre +
 * celular), para el restaurante o la persona que pide por WhatsApp y nunca
 * entró a la tienda.
 */

export type BuyerSelection =
  | { kind: 'existing'; buyer: Buyer }
  | { kind: 'new'; full_name: string; phone: string }
  | null

interface BuyerPickerProps {
  value: BuyerSelection
  onChange: (value: BuyerSelection) => void
  /** Texto del campo: «restaurante» en corporativo, «cliente» en detal. */
  noun: string
  /** Permite crear uno nuevo (no aplica a «Repetir último»). */
  allowNew?: boolean
  disabled?: boolean
}

const SEARCH_DEBOUNCE_MS = 250

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/[0.4] dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

/** El correo de un invitado es sintético: no sirve para identificarlo. */
function buyerSubtitle(buyer: Buyer): string {
  const realEmail = buyer.email && !buyer.email.endsWith('@guest.ruta') ? buyer.email : null
  return [buyer.phone, realEmail].filter(Boolean).join(' · ') || 'sin datos de contacto'
}

export default function BuyerPicker({ value, onChange, noun, allowNew = true, disabled }: BuyerPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Buyer[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    if (value?.kind !== undefined) return
    const requestId = ++requestRef.current
    setSearching(true)
    const timer = setTimeout(() => {
      listBuyers({ q: query.trim() || undefined, page_size: 20 })
        .then((res) => {
          if (requestId === requestRef.current) setResults(res.data ?? [])
        })
        .catch(() => {
          if (requestId === requestRef.current) setResults([])
        })
        .finally(() => {
          if (requestId === requestRef.current) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, value])

  if (value?.kind === 'existing') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-brand-400/40 bg-brand-500/[0.08] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {value.buyer.full_name || value.buyer.email}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{buyerSubtitle(value.buyer)}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="shrink-0 text-xs font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
        >
          Cambiar
        </button>
      </div>
    )
  }

  if (value?.kind === 'new') {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-emerald-400/30 bg-emerald-500/[0.06] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Nuevo {noun}: se registra al crear el pedido
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300"
          >
            Buscar uno existente
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="new-buyer-name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-buyer-name"
              value={value.full_name}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, full_name: e.target.value })}
              placeholder={noun === 'restaurante' ? 'Restaurante La Casona' : 'Nombre y apellido'}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-buyer-phone" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Celular <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-buyer-phone"
              type="tel"
              value={value.phone}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="+57 300 000 0000"
              className={inputClass}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Se cierra con un pequeño retraso para que el clic en un resultado llegue.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Escribe el nombre, correo o celular del ${noun}…`}
        aria-label={`Buscar ${noun}`}
        className={inputClass}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1d2025]">
          {searching && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              {query.trim() ? `Ningún ${noun} coincide con «${query.trim()}».` : `Aún no hay ${noun}s.`}
            </p>
          ) : (
            <ul>
              {results.map((buyer) => (
                <li key={buyer.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ kind: 'existing', buyer })
                      setOpen(false)
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-brand-500/[0.08]"
                  >
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {buyer.full_name || buyer.email}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {buyerSubtitle(buyer)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {allowNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange({ kind: 'new', full_name: query.trim(), phone: '' })
                setOpen(false)
              }}
              className="block w-full border-t border-slate-200 px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-500/[0.08] dark:border-white/10 dark:text-brand-300"
            >
              + Registrar {query.trim() ? `«${query.trim()}»` : `un ${noun} nuevo`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
