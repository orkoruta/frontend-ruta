'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import {
  getDeliveryEmailConfig,
  saveDeliveryEmailConfig,
  type DeliveryEmailConfig,
  type ApiError,
} from '@/lib/notifications.api'

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white/[0.85] px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-100'

/**
 * Correo de aviso al comprador cuando se entrega el pedido.
 *
 * El correo **sale desde la dirección de RUTA**, que es el único dominio
 * verificado con el proveedor, mostrando el nombre del negocio como remitente.
 * El Cliente no configura una dirección de envío sino una **de respuesta**: así
 * no tiene que verificar su dominio, y aun así las respuestas del comprador le
 * llegan a él. Se explica en pantalla, porque «desde dónde sale mi correo» es
 * justo lo que un Cliente espera poder elegir.
 *
 * También se avisa de que **a los invitados no se les escribe**: su correo es
 * sintético y enviarlo generaría rebotes.
 */
export function DeliveryEmailTab() {
  const [config, setConfig] = useState<DeliveryEmailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [replyTo, setReplyTo] = useState('')
  const [fromName, setFromName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    let active = true
    getDeliveryEmailConfig()
      .then((data) => {
        if (!active) return
        setConfig(data)
        setEnabled(data.enabled)
        setReplyTo(data.reply_to)
        setFromName(data.from_name)
        setSubject(data.subject)
        setBody(data.body)
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const saved = await saveDeliveryEmailConfig({
        enabled,
        reply_to: replyTo.trim(),
        from_name: fromName.trim(),
        subject: subject.trim(),
        body: body.trim(),
      })
      setConfig(saved)
      setEnabled(saved.enabled)
      setSuccess(
        saved.enabled
          ? 'Guardado. Se enviará el aviso cuando entregues un pedido.'
          : 'Guardado. El aviso está desactivado.',
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
        <div className="u-skeleton h-64 rounded-lg" />
      </RutaCard>
    )
  }

  const enablingWithoutReplyTo = enabled && !replyTo.trim()

  return (
    <RutaCard>
      <RutaSectionHeader title="Aviso de entrega" subtitle="correo al comprador" />

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Cuando marques un pedido como entregado, le llega este correo al
        comprador. Tú defines con qué nombre firmas, a dónde te responden y qué
        dice el mensaje.
      </p>

      <p className="mt-3 rounded-lg border border-slate-300/60 bg-slate-500/[0.08] px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
        El correo sale desde la dirección de RUTA mostrando el nombre de tu
        negocio, y cuando el comprador responda te escribirá a ti. Lo hacemos
        así para que no tengas que verificar tu dominio con el proveedor de
        correo.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email-reply-to" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Correo de respuesta
            </label>
            <input
              id="email-reply-to"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="pedidos@tunegocio.com"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Si el comprador responde el correo, le llega a esta dirección.
            </p>
          </div>

          <div>
            <label htmlFor="email-from-name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nombre del remitente
            </label>
            <input
              id="email-from-name"
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Pizzería La Colina"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Lo que ve el comprador como remitente. Vacío = el nombre de tu
              negocio.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="email-subject" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Asunto
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email-body" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Mensaje
          </label>
          <textarea
            id="email-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
          />
          {/* Sin la lista de marcas, editar la plantilla es adivinar. */}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Puedes usar estas marcas en el asunto y el mensaje; se reemplazan al
            enviar:{' '}
            {(config?.placeholders ?? []).map((ph, i) => (
              <span key={ph}>
                {i > 0 && ', '}
                <code className="rounded bg-slate-500/[0.12] px-1 py-0.5 font-mono text-[11px]">
                  {`{{${ph}}}`}
                </code>
              </span>
            ))}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:border-white/20"
          />
          Enviar el aviso al entregar un pedido
        </label>

        {enablingWithoutReplyTo && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Necesitas un correo de respuesta para poder activarlo.
          </p>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-500">
          A los compradores que pidieron <strong>como invitados</strong> no se
          les escribe: no dejan un correo real, solo su teléfono.
        </p>

        <RutaButton type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </RutaButton>
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
