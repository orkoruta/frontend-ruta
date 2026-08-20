'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  getNequiConfig,
  saveNequiConfig,
  type NequiConfig,
  type ApiError,
} from '@/lib/payment_config.api'

/**
 * Link de pago de Nequi Negocios.
 *
 * Es distinto de Wompi y conviene tenerlo claro: un link de Nequi **no avisa a
 * RUTA cuando alguien paga**. No hay webhook. El comprador paga desde su app y
 * el negocio lo ve en la suya, así que el pedido queda esperando a que el
 * Cliente confirme el pago a mano desde el detalle del pedido.
 *
 * Eso se le dice en la pantalla, no solo en este comentario: activar un medio
 * de pago creyendo que se concilia solo llevaría a pedidos parados sin que
 * nadie entienda por qué.
 */
export function NequiTab() {
  const [config, setConfig] = useState<NequiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')

  useEffect(() => {
    let active = true
    getNequiConfig()
      .then((data) => {
        if (!active) return
        setConfig(data)
        setEnabled(data.enabled)
        setPaymentLink(data.payment_link)
      })
      .catch((err) => {
        if (!active) return
        setError((err as ApiError).message ?? 'No pudimos cargar la configuración.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await saveNequiConfig({ enabled, payment_link: paymentLink.trim() })
      setConfig(saved)
      setEnabled(saved.enabled)
      setPaymentLink(saved.payment_link)
      setSuccess(
        saved.enabled
          ? 'Listo. Tus compradores ya ven la opción de pagar con Nequi.'
          : 'Guardado. La opción no se muestra en la tienda.',
      )
    } catch (err) {
      setError((err as ApiError).message ?? 'No pudimos guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RutaCard>
        <div className="u-skeleton h-32 rounded-lg" />
      </RutaCard>
    )
  }

  // Activar sin link deja una opción que no lleva a ningún sitio: el backend lo
  // rechaza guardándolo como inactivo, y aquí se avisa antes de intentarlo.
  const enablingWithoutLink = enabled && !paymentLink.trim()

  return (
    <RutaCard>
      <RutaSectionHeader title="Nequi Negocios" subtitle="link de pago" />

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Pega aquí el link de pago de tu cuenta Nequi Negocios. Cuando esté
        activo, el comprador podrá elegirlo al pagar y lo enviaremos a ese link.
      </p>

      <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/[0.12] px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        <strong>Nequi no nos avisa cuando alguien paga.</strong> Verifica el pago
        en tu app de Nequi y confírmalo en el detalle del pedido con el botón
        «Confirmar pago recibido». Hasta entonces el pedido queda esperando, y no
        se cancela solo.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="nequi-link"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Link de pago
          </label>
          <input
            id="nequi-link"
            type="url"
            inputMode="url"
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            placeholder="https://recaudo.nequi.com/..."
            className="w-full rounded-lg border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Lo encuentras en tu app de Nequi Negocios, en la sección de recaudos.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/20"
          />
          Mostrar Nequi como opción de pago en la tienda
        </label>

        {enablingWithoutLink && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Necesitas pegar el link para poder activarlo.
          </p>
        )}

        <div className="flex items-center gap-3">
          <RutaButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </RutaButton>

          {config?.updated_at && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Actualizado{' '}
              {new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(config.updated_at))}
            </span>
          )}
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}
    </RutaCard>
  )
}
