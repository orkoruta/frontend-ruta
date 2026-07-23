'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaPasswordInput, RutaSectionHeader } from '@orkoruta/ui'
import {
  getWompiConfig,
  saveWompiConfig,
  type ApiError,
  type WompiConfig,
} from '@/lib/payment_config.api'

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 ' +
  'dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

export function WompiTab() {
  const [config, setConfig] = useState<WompiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Campos del formulario. Los secretos arrancan vacíos: solo se envían si el
  // usuario escribe algo nuevo (vacío = conservar el guardado).
  const [enabled, setEnabled] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [eventsSecret, setEventsSecret] = useState('')

  function hydrate(data: WompiConfig) {
    setConfig(data)
    setEnabled(data.enabled)
    setPublicKey(data.public_key)
    setPrivateKey('')
    setEventsSecret('')
  }

  useEffect(() => {
    let active = true
    getWompiConfig()
      .then((data) => {
        if (active) hydrate(data)
      })
      .catch((err) => {
        if (active) setError((err as ApiError).message ?? 'No pudimos cargar la configuración.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await saveWompiConfig({
        enabled,
        public_key: publicKey.trim(),
        // Solo se mandan si el usuario escribió algo.
        ...(privateKey.trim() ? { private_key: privateKey.trim() } : {}),
        ...(eventsSecret.trim() ? { events_secret: eventsSecret.trim() } : {}),
      })
      hydrate(updated)
      setSuccess('Configuración de Wompi guardada.')
    } catch (err) {
      setError((err as ApiError).message ?? 'No pudimos guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RutaCard>
        <RutaSectionHeader title="Pasarela de pagos Wompi" subtitle="configuración" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando configuración…</p>
      </RutaCard>
    )
  }

  return (
    <RutaCard>
      <RutaSectionHeader title="Pasarela de pagos Wompi" subtitle="configuración" />

      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Ingresa las credenciales de tu cuenta de Wompi. Con la pasarela activa, tus compradores
        podrán pagar en línea al confirmar el pedido. Encuentras estas claves en tu panel de Wompi,
        en <span className="font-medium">Desarrolladores</span>.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mb-4 rounded-md border border-emerald-400/25 bg-emerald-500/[0.12] px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        {/* Activar/desactivar */}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400/40"
          />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Aceptar pagos en línea con Wompi
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Llave pública (public key)
          </span>
          <input
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="pub_prod_…"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Llave privada (private key)
          </span>
          <RutaPasswordInput
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder={
              config?.has_private_key
                ? '•••••••• (guardada — escribe para cambiar)'
                : 'prv_prod_…'
            }
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Secreto de eventos (events secret)
          </span>
          <RutaPasswordInput
            value={eventsSecret}
            onChange={(e) => setEventsSecret(e.target.value)}
            placeholder={
              config?.has_webhook_secret
                ? '•••••••• (guardado — escribe para cambiar)'
                : 'Secreto para validar los webhooks de Wompi'
            }
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Por seguridad, las llaves privadas y secretos guardados no se vuelven a mostrar. Déjalos
          en blanco para conservar los actuales; escribe un valor nuevo solo si quieres
          reemplazarlos.
        </p>

        <div>
          <RutaButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </RutaButton>
        </div>
      </form>
    </RutaCard>
  )
}
