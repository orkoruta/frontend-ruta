import type { ReactNode } from 'react'
import { RutaRouteBackdrop } from './RutaRouteBackdrop'

interface RutaEmptyStateProps {
  /** Ilustración de `illustrations.tsx`. Se le pasa el tamaño desde aquí. */
  illustration?: ReactNode
  /** Qué pasa, en una frase. Sin disculpas ni signos de admiración. */
  title: string
  /** Qué puede hacer la persona a continuación. Opcional. */
  description?: string
  /** Acción principal, si la hay. */
  action?: ReactNode
  /** `sm` para paneles laterales y tarjetas; `md` para páginas completas. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Estado vacío.
 *
 * Una pantalla vacía es una invitación a actuar, no un mensaje de error: por
 * eso el texto dice qué hacer y no se disculpa. La ilustración es opcional —
 * en un panel estrecho estorba más de lo que aporta.
 */
export function RutaEmptyState({
  illustration,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: RutaEmptyStateProps) {
  const compact = size === 'sm'

  return (
    <div
      className={[
        'u-in relative isolate flex flex-col items-center overflow-hidden text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-12',
        className,
      ].join(' ')}
    >
      {/* En el tamaño grande hay sitio para la atmósfera de marca; en el
          compacto (paneles laterales) satura y se omite. */}
      {!compact && <RutaRouteBackdrop variant="flow" className="text-brand-500/[0.10]" />}
      {illustration && (
        <div className={compact ? 'w-28 text-brand-500' : 'w-40 text-brand-500'}>
          {illustration}
        </div>
      )}

      <p
        className={[
          'font-semibold text-slate-900 dark:text-slate-100',
          compact ? 'text-sm' : 'text-base',
        ].join(' ')}
      >
        {title}
      </p>

      {description && (
        <p
          className={[
            'max-w-sm text-slate-500 dark:text-slate-400',
            compact ? 'text-xs' : 'text-sm',
          ].join(' ')}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
