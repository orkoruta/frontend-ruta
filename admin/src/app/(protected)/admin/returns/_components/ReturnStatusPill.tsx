import type { ReturnStatus } from '@/lib/returns.api'

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  RETURN_REQUESTED: 'Solicitada',
  RETURN_UNDER_REVIEW: 'En revisión',
  RETURN_APPROVED: 'Aprobada',
  RETURN_REJECTED: 'Rechazada',
  CUSTOMER_RETURN_IN_TRANSIT: 'En tránsito',
  PICKUP_SCHEDULED: 'Recogida programada',
  PICKUP_COLLECTED: 'Recogida realizada',
  RETURN_RECEIVED: 'Recibida',
  RETURN_LOST: 'Perdida',
  RETURN_CANCELLED: 'Cancelada',
}

type Color = 'amber' | 'blue' | 'violet' | 'green' | 'red' | 'slate' | 'sky' | 'rose'

function statusColor(status: ReturnStatus): Color {
  switch (status) {
    case 'RETURN_REQUESTED':
      return 'amber'
    case 'RETURN_UNDER_REVIEW':
      return 'blue'
    case 'RETURN_APPROVED':
      return 'violet'
    case 'RETURN_REJECTED':
      return 'red'
    case 'CUSTOMER_RETURN_IN_TRANSIT':
    case 'PICKUP_SCHEDULED':
      return 'sky'
    case 'PICKUP_COLLECTED':
      return 'violet'
    case 'RETURN_RECEIVED':
      return 'green'
    case 'RETURN_LOST':
      return 'rose'
    case 'RETURN_CANCELLED':
      return 'slate'
  }
}

const COLOR_CLASSES: Record<Color, string> = {
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
  slate:  'bg-slate-500/[0.12] text-slate-600 border-slate-400/25 dark:text-slate-400',
  sky:    'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  rose:   'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}

interface Props {
  status: ReturnStatus | string
}

export function ReturnStatusPill({ status }: Props) {
  const s = status as ReturnStatus
  const color = statusColor(s)
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold',
        COLOR_CLASSES[color],
      ].join(' ')}
    >
      {RETURN_STATUS_LABELS[s] ?? status}
    </span>
  )
}
