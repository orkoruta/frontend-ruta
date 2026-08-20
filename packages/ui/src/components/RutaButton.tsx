type ButtonVariant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'neutral'
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * `primary` es el único variante **sólido**: en una pantalla llena de botones
 * tintados, el relleno de marca deja claro cuál es la acción principal. Los
 * demás conservan el tratamiento tintado, que ahora lee como secundario.
 * Los colores no primarios son semánticos (éxito / aviso / error) y no se
 * cambian por marca: significan algo.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-brand-500 text-white border-brand-500 shadow-brand hover:bg-brand-600 hover:border-brand-600 active:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 dark:border-transparent',
  success:   'bg-emerald-500/[0.12] text-emerald-700 border-emerald-400/40 hover:bg-emerald-500/[0.2] dark:text-emerald-300 dark:border-emerald-400/25',
  warning:   'bg-amber-500/[0.12] text-amber-700 border-amber-400/40 hover:bg-amber-500/[0.2] dark:text-amber-300 dark:border-amber-400/25',
  danger:    'bg-rose-500/[0.12] text-rose-700 border-rose-400/40 hover:bg-rose-500/[0.2] dark:text-rose-300 dark:border-rose-400/25',
  secondary: 'bg-brand-500/[0.12] text-brand-700 border-brand-400/40 hover:bg-brand-500/[0.2] dark:text-brand-300 dark:border-brand-400/25',
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
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border font-medium',
        // La transición cubre color y sombra para que el hover del primario
        // no salte; `active:translate-y-px` da la sensación de pulsación.
        'transition-[background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px',
        // Foco visible de marca, consistente en toda la app y solo con teclado.
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
