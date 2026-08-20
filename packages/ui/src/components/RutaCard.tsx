interface RutaCardProps {
  children: React.ReactNode
  className?: string
}

/**
 * Superficie base de la app.
 *
 * El radio pasó de `lg` a `xl` y el borde plano se reemplazó por borde + una
 * sombra muy suave: da profundidad sin el efecto "caja dibujada" del borde
 * duro. En oscuro la sombra no se ve, así que ahí el borde sigue haciendo el
 * trabajo de separar la tarjeta del fondo.
 */
export function RutaCard({ children, className = '' }: RutaCardProps) {
  return (
    <div
      className={[
        'rounded-xl border p-4',
        'bg-white/[0.76] border-slate-200/80 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_4px_16px_-6px_rgb(15_23_42/0.10)]',
        'dark:bg-[#1d2025]/[0.78] dark:border-white/10 dark:shadow-none',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
