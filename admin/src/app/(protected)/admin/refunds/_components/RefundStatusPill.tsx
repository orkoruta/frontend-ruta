import type { RefundStatus } from '@/lib/refunds.api'

const STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  PROVIDER_REQUESTED: 'Solicitado a proveedor',
  REFUNDED: 'Reembolsado',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  FAILED: 'Fallido',
}

type Color = 'amber' | 'blue' | 'violet' | 'green' | 'red'

function statusColor(status: RefundStatus): Color {
  if (status === 'PENDING') return 'amber'
  if (status === 'PROCESSING') return 'blue'
  if (status === 'PROVIDER_REQUESTED') return 'violet'
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'green'
  return 'red'
}

const COLOR_CLASSES: Record<Color, string> = {
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}

interface Props {
  status: RefundStatus | string
}

export function RefundStatusPill({ status }: Props) {
  const s = status as RefundStatus
  const color = statusColor(s)
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
        COLOR_CLASSES[color],
      ].join(' ')}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  )
}
