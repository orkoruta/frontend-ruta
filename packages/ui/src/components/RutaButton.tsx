type ButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'neutral'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-sky-500/[0.12] text-sky-700 border-sky-400/40 hover:bg-sky-500/[0.2] dark:text-sky-300 dark:border-sky-400/25',
  success:   'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/40 hover:bg-emerald-500/[0.2] dark:text-emerald-300 dark:border-emerald-400/25',
  warning:   'bg-amber-500/[0.12] text-amber-700 border-amber-400/40 hover:bg-amber-500/[0.2] dark:text-amber-300 dark:border-amber-400/25',
  danger:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/40 hover:bg-rose-500/[0.2] dark:text-rose-300 dark:border-rose-400/25',
  secondary: 'bg-violet-500/[0.12] text-violet-700 border-violet-400/40 hover:bg-violet-500/[0.2] dark:text-violet-300 dark:border-violet-400/25',
  neutral:   'bg-white/[0.06] text-slate-600 border-slate-200 hover:bg-white/[0.12] dark:text-slate-300 dark:border-white/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-4 py-2 text-sm',
  lg:  'px-5 py-2.5 text-base',
}

interface RutaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

export function RutaButton({ variant = 'neutral', size = 'md', className = '', children, ...props }: RutaButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
