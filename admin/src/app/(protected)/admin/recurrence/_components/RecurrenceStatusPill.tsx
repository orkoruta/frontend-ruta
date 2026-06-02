import type { RecurrenceStatus } from '@/lib/recurrence.api'

const STATUS_LABELS: Record<RecurrenceStatus, string> = {
  RECURRENCE_ACTIVE: 'Activa',
  RECURRENCE_PAUSED: 'Pausada',
  RECURRENCE_CANCELLED: 'Cancelada',
}

type Color = 'green' | 'amber' | 'red'

function statusColor(status: RecurrenceStatus): Color {
  if (status === 'RECURRENCE_ACTIVE') return 'green'
  if (status === 'RECURRENCE_PAUSED') return 'amber'
  return 'red'
}

const COLOR_CLASSES: Record<Color, string> = {
  green:
    'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/25 dark:text-emerald-300',
  amber:
    'bg-amber-500/[0.12] text-amber-700 border-amber-400/25 dark:text-amber-300',
  red: 'bg-rose-500/[0.12] text-rose-700 border-rose-400/25 dark:text-rose-300',
}

interface Props {
  status: RecurrenceStatus | string
}

export function RecurrenceStatusPill({ status }: Props) {
  const s = status as RecurrenceStatus
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
