'use client'

/**
 * Foto del recibo del cobro contra entrega.
 *
 * La imagen no viaja dentro del detalle del pedido: pesa cientos de kB y la
 * mayoría de las pantallas no la necesitan. Se pide a su propio endpoint al
 * abrir la tarjeta, con un botón para volver a pedirla.
 *
 * El navegador decodifica el base64 solo: un `data:image/jpeg;base64,…` puesto
 * en el `src` de un `<img>` se pinta sin conversión previa.
 */

import { useCallback, useEffect, useState } from 'react'
import { RutaButton, RutaCard, RutaSectionHeader } from '@orkoruta/ui'
import { getCollectionEvidence, type CollectionEvidence } from '@/lib/collection_evidence.api'

interface Props {
  orderId: number
  /** `courier` consulta solo sus pedidos; `admin` cualquiera del Cliente. */
  scope: 'courier' | 'admin'
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Nombre con el que se guarda la foto. La extensión sale del tipo declarado en
 * el data URI para no bautizar como `.jpg` un png; si es una URL http se deja
 * que el navegador use la del propio archivo.
 */
function downloadName(evidence: CollectionEvidence): string {
  const match = /^data:image\/(jpeg|jpg|png|webp);/.exec(evidence.evidence_url)
  if (!match) return ''
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1]
  return `recibo-pedido-${evidence.order_id}.${extension}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function CollectionEvidenceCard({ orderId, scope }: Props) {
  const [evidence, setEvidence] = useState<CollectionEvidence | null>(null)
  const [loading, setLoading] = useState(true)
  // `notFound` no es un error: la mayoría de pedidos no tiene cobro contra
  // entrega, y en ese caso la tarjeta simplemente no se muestra.
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvidence(await getCollectionEvidence(scope, orderId))
      setNotFound(false)
    } catch (err) {
      const apiErr = err as { code?: string; message?: string }
      if (apiErr.code === 'RESOURCE_NOT_FOUND') {
        setNotFound(true)
      } else {
        setError(apiErr.message ?? 'No pudimos cargar la foto del recibo.')
      }
    } finally {
      setLoading(false)
    }
  }, [orderId, scope])

  useEffect(() => {
    void load()
  }, [load])

  if (notFound) return null

  return (
    <RutaCard>
      <div className="flex items-start justify-between gap-3">
        <RutaSectionHeader title="Foto del recibo" subtitle="evidencia del cobro" className="mb-0" />
        <RutaButton type="button" variant="neutral" size="sm" disabled={loading} onClick={() => void load()}>
          {loading ? 'Cargando…' : 'Recargar'}
        </RutaButton>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-rose-400/25 bg-rose-500/[0.12] px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {loading && !evidence && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cargando la foto…</p>
      )}

      {evidence && (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI: no pasa por el optimizador de Next */}
          <img
            src={evidence.evidence_url}
            alt={`Recibo del cobro del pedido #${evidence.order_id}`}
            className="w-full rounded-md border border-slate-200 dark:border-white/10"
          />

          <p className="text-sm text-slate-700 dark:text-slate-300">
            {formatCOP(evidence.amount)}
            {evidence.payment_method_submethod ? ` · ${evidence.payment_method_submethod}` : ''}
          </p>

          {evidence.collected_at && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cobrado el {formatDate(evidence.collected_at)}
            </p>
          )}

          {evidence.notes && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{evidence.notes}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={evidence.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-sky-700 dark:text-sky-300"
            >
              Ver en tamaño completo →
            </a>
            <a
              href={evidence.evidence_url}
              // `download` sobre un data URI guarda el archivo directamente, sin
              // pasar por la red.
              download={downloadName(evidence)}
              className="flex min-h-[40px] items-center gap-2 rounded-md border border-slate-200 bg-white/[0.06] px-3 text-sm font-semibold text-slate-700 hover:bg-white/[0.12] dark:border-white/10 dark:text-slate-200"
            >
              ⤓ Descargar foto
            </a>
          </div>
        </div>
      )}
    </RutaCard>
  )
}
