type PillVariant = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate'

const pillVariants: Record<PillVariant, string> = {
  blue:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/40 dark:text-sky-300 dark:border-sky-400/25',
  green:  'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/40 dark:text-emerald-300 dark:border-emerald-400/25',
  amber:  'bg-amber-500/[0.12] text-amber-700 border-amber-400/40 dark:text-amber-300 dark:border-amber-400/25',
  red:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/40 dark:text-rose-300 dark:border-rose-400/25',
  violet: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/40 dark:text-violet-300 dark:border-violet-400/25',
  slate:  'bg-white/[0.06] text-slate-600 border-slate-200 dark:text-slate-300 dark:border-white/10',
}

interface RutaPillProps {
  variant?: PillVariant
  children: React.ReactNode
  className?: string
}

export function RutaPill({ variant = 'slate', children, className = '' }: RutaPillProps) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${pillVariants[variant]} ${className}`}>
      {children}
    </span>
  )
}
