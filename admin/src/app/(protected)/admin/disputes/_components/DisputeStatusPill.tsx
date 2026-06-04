import type { DisputeStatus } from '@/lib/disputes.api'

const STATUS_LABELS: Record<DisputeStatus, string> = {
  DISPUTED: 'Disputa abierta',
  DISPUTE_UNDER_REVIEW: 'En revisión',
  DISPUTE_RESOLVED_NO_ACTION: 'Resuelta: sin acción',
  DISPUTE_RESOLVED_WITH_RETURN: 'Resuelta: con devolución',
  DISPUTE_RESOLVED_WITH_REFUND: 'Resuelta: con reembolso',
}

type Color = 'amber' | 'blue' | 'slate' | 'emerald' | 'violet'

function statusColor(status: DisputeStatus): Color {
  if (status === 'DISPUTED') return 'amber'
  if (status === 'DISPUTE_UNDER_REVIEW') return 'blue'
  if (status === 'DISPUTE_RESOLVED_NO_ACTION') return 'slate'
  if (status === 'DISPUTE_RESOLVED_WITH_RETURN') return 'violet'
  if (status === 'DISPUTE_RESOLVED_WITH_REFUND') return 'emerald'
  return 'slate'
}

const COLOR_CLASSES: Record<Color, string> = {
  amber:   'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  blue:    'bg-sky-500/[0.12] text-sky-700 border-sky-400/25 dark:text-sky-300',
  slate:   'bg-slate-500/[0.12] text-slate-700 border-slate-400/25 dark:text-slate-300',
  emerald: 'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  violet:  'bg-violet-500/[0.12] text-violet-700 border-violet-400/25 dark:text-violet-300',
}

interface Props {
  status: DisputeStatus | string
}

export function DisputeStatusPill({ status }: Props) {
  const s = status as DisputeStatus
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
